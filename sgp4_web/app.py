"""
SGP4 Satellite Propagation Web Interface

A web interface for the SGP4 satellite propagation library.
"""

from flask import Flask, render_template, jsonify, request, g
from sgp4.api import Satrec, jday
from datetime import datetime, timedelta
import math
import sqlite3

app = Flask(__name__)

DATABASE = 'sgp4_tles.db'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row # Access columns by name
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        with app.open_resource('schema.sql', mode='r') as f:
            db.cursor().executescript(f.read())
        db.commit()

# Command to initialize DB: flask init-db
@app.cli.command('init-db')
def init_db_command():
    """Clear existing data and create new tables."""
    init_db()
    print('Initialized the database.')

# API Endpoints for TLE Management
@app.route('/api/tles', methods=['POST'])
def add_tle():
    data = request.get_json()
    name = data.get('name')
    line1 = data.get('line1')
    line2 = data.get('line2')

    if not name or not line1 or not line2:
        return jsonify({'error': 'Missing data for TLE (name, line1, line2 required)'}), 400

    try:
        db = get_db()
        cursor = db.execute('INSERT INTO tles (name, line1, line2) VALUES (?, ?, ?)',
                            [name, line1, line2])
        db.commit()
        return jsonify({'id': cursor.lastrowid, 'name': name, 'line1': line1, 'line2': line2}), 201
    except sqlite3.IntegrityError: # Should not happen with current schema unless we add unique constraints
        return jsonify({'error': 'TLE already exists or data invalid'}), 400
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/tles', methods=['GET'])
def get_tles():
    try:
        db = get_db()
        cursor = db.execute('SELECT id, name, line1, line2, created_at FROM tles ORDER BY created_at DESC')
        tles = [dict(row) for row in cursor.fetchall()]
        return jsonify(tles)
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/tles/<int:tle_id>', methods=['GET'])
def get_tle(tle_id):
    try:
        db = get_db()
        cursor = db.execute('SELECT id, name, line1, line2, created_at FROM tles WHERE id = ?', [tle_id])
        tle = dict(cursor.fetchone())
        if tle:
            return jsonify(tle)
        else:
            return jsonify({'error': 'TLE not found'}), 404
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/tles/<int:tle_id>', methods=['PUT'])
def update_tle(tle_id):
    data = request.get_json()
    name = data.get('name')
    line1 = data.get('line1')
    line2 = data.get('line2')

    if not name or not line1 or not line2:
        return jsonify({'error': 'Missing data for TLE (name, line1, line2 required)'}), 400

    try:
        db = get_db()
        cursor = db.execute('UPDATE tles SET name = ?, line1 = ?, line2 = ? WHERE id = ?',
                            [name, line1, line2, tle_id])
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'TLE not found or no change made'}), 404
        return jsonify({'id': tle_id, 'name': name, 'line1': line1, 'line2': line2})
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/tles/<int:tle_id>', methods=['DELETE'])
def delete_tle(tle_id):
    try:
        db = get_db()
        cursor = db.execute('DELETE FROM tles WHERE id = ?', [tle_id])
        db.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'TLE not found'}), 404
        return jsonify({'message': 'TLE deleted successfully'})
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

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
            'timestamp': (now + timedelta(hours=5, minutes=30)).isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Run with: ./.venv/bin/python sgp4_web/app.py
    app.run(debug=True)

