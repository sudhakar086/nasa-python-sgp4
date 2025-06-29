"""
SGP4 Satellite Propagation Web Interface

A web interface for the SGP4 satellite propagation library.
"""

from flask import Flask, render_template, jsonify, request
from sgp4.api import Satrec, jday
from datetime import datetime, timedelta
import math

app = Flask(__name__)

def eci_to_geodetic(x, y, z, dt):
    # WGS84 constants
    a = 6378.137  # km
    f = 1/298.257223563
    b = a * (1 - f)
    e2 = 1 - (b**2 / a**2)

    # Greenwich Sidereal Time (approximate)
    jd = 367 * dt.year - int((7 * (dt.year + int((dt.month + 9) / 12))) / 4) + int((275 * dt.month) / 9) + dt.day + 1721013.5 + ((dt.hour + dt.minute / 60 + dt.second / 3600) / 24)
    T = (jd - 2451545.0) / 36525.0
    GMST = 280.46061837 + 360.98564736629 * (jd - 2451545) + 0.000387933 * T**2 - (T**3) / 38710000.0
    GMST = math.radians(GMST % 360)

    # Rotate ECI to ECEF
    x_ecef = math.cos(GMST) * x + math.sin(GMST) * y
    y_ecef = -math.sin(GMST) * x + math.cos(GMST) * y
    z_ecef = z

    # Calculate longitude
    lon = math.atan2(y_ecef, x_ecef)

    # Calculate latitude and altitude (iterative)
    r = math.sqrt(x_ecef**2 + y_ecef**2)
    lat = math.atan2(z_ecef, r)
    prev_lat = 0
    while abs(lat - prev_lat) > 1e-10:
        prev_lat = lat
        N = a / math.sqrt(1 - e2 * math.sin(lat)**2)
        alt = r / math.cos(lat) - N
        lat = math.atan2(z_ecef, r * (1 - e2 * N / (N + alt)))
    N = a / math.sqrt(1 - e2 * math.sin(lat)**2)
    alt = r / math.cos(lat) - N

    return math.degrees(lat), math.degrees(lon), alt

@app.route('/')
def index():
    """Render the main page."""
    return render_template('index.html')

@app.route('/calculate', methods=['POST'])
def calculate():
    """Calculate satellite position and velocity."""
    try:
        data = request.get_json()
        
        # Parse TLE data
        line1 = data.get('line1', '').strip()
        line2 = data.get('line2', '').strip()
        
        if not line1 or not line2:
            return jsonify({'error': 'TLE data is required'}), 400
        
        # Create satellite object
        satellite = Satrec.twoline2rv(line1, line2)
        
        # Get current time
        now = datetime.utcnow()
        jd, fr = jday(now.year, now.month, now.day, 
                     now.hour, now.minute, now.second)
        
        # Calculate position and velocity
        e, r, v = satellite.sgp4(jd + fr, 0.0)
        
        if e != 0:
            return jsonify({'error': 'Error in satellite propagation'}), 400

        lat, lon, alt = eci_to_geodetic(r[0], r[1], r[2], now)
        
        # Calculate ground track (future path) for the next 45 minutes
        # with points every 5 minutes
        path = []
        for minutes_ahead in range(0, 46, 5):
            future_time = now + timedelta(minutes=minutes_ahead)
            future_jd, future_fr = jday(future_time.year, future_time.month, future_time.day,
                                        future_time.hour, future_time.minute, future_time.second)
            try:
                e, r, v = satellite.sgp4(future_jd + future_fr, 0.0)
                if e == 0:
                    future_lat, future_lon, future_alt = eci_to_geodetic(r[0], r[1], r[2], future_time)
                    path.append({
                        'lat': future_lat,
                        'lon': future_lon,
                        'alt': future_alt,
                        'time': minutes_ahead
                    })
            except Exception:
                pass

        # Calculate ground track (past path) for the previous 45 minutes
        # with points every 5 minutes
        past_path = []
        for minutes_ago in range(45, 0, -5):
            past_time = now - timedelta(minutes=minutes_ago)
            past_jd, past_fr = jday(past_time.year, past_time.month, past_time.day,
                                    past_time.hour, past_time.minute, past_time.second)
            try:
                e, r, v = satellite.sgp4(past_jd + past_fr, 0.0)
                if e == 0:
                    past_lat, past_lon, past_alt = eci_to_geodetic(r[0], r[1], r[2], past_time)
                    past_path.append({
                        'lat': past_lat,
                        'lon': past_lon,
                        'alt': past_alt,
                        'time': -minutes_ago
                    })
            except Exception:
                pass
        
        return jsonify({
            'position': {
                'x': r[0],
                'y': r[1],
                'z': r[2],
                'lat': lat,
                'lon': lon,
                'alt': alt
            },
            'velocity': {
                'x': v[0],
                'y': v[1],
                'z': v[2]
            },
            'path': path,
            'past_path': past_path,
            'timestamp': now.isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

