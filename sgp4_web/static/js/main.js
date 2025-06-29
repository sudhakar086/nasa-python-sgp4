document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('satelliteForm');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');

    // Initialize Leaflet map
    let map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    let marker = L.circleMarker([0, 0], {
        radius: 5,
        color: '#FF4500',
        fillColor: '#FF4500',
        fillOpacity: 1,
        weight: 1
    }).addTo(map);
    
    // Helper function to split path at dateline
    function splitPathAtDateline(points) {
        if (points.length < 2) return [points];
        const segments = [];
        let current = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            if (Math.abs(curr[1] - prev[1]) > 180) {
                segments.push(current);
                current = [curr];
            } else {
                current.push(curr);
            }
        }
        if (current.length > 0) segments.push(current);
        return segments;
    }

    // Create arrays to hold segment polylines
    let pastLines = [];
    let futureLines = [];
    function removeLines(lines) {
        lines.forEach(line => map.removeLayer(line));
        lines.length = 0;
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Hide any previous errors
        errorDiv.classList.add('d-none');
        
        // Get form data
        const line1 = document.getElementById('line1').value.trim();
        const line2 = document.getElementById('line2').value.trim();
        
        // Make API request
        fetch('/calculate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                line1: line1,
                line2: line2
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Update UI with results
            document.getElementById('posX').textContent = data.position.x.toFixed(2);
            document.getElementById('posY').textContent = data.position.y.toFixed(2);
            document.getElementById('posZ').textContent = data.position.z.toFixed(2);
            
            document.getElementById('velX').textContent = data.velocity.x.toFixed(6);
            document.getElementById('velY').textContent = data.velocity.y.toFixed(6);
            document.getElementById('velZ').textContent = data.velocity.z.toFixed(6);
            
            const date = new Date(data.timestamp);
            document.getElementById('timestamp').textContent = date.toLocaleString();
            
            // Plot on map
            if (typeof data.position.lat === 'number' && typeof data.position.lon === 'number') {
                // Set current position marker
                marker.setLatLng([data.position.lat, data.position.lon]);
                map.setView([data.position.lat, data.position.lon], 3, { animate: true });
                marker.bindPopup(
                    `<div style="font-size: 0.9em;"><b>Satellite</b><br>Lat: ${data.position.lat.toFixed(4)}<br>Lon: ${data.position.lon.toFixed(4)}<br>Alt: ${data.position.alt.toFixed(1)} km</div>`,
                    { maxWidth: 120 }
                ).openPopup();
                
                // Remove old lines
                removeLines(pastLines);
                removeLines(futureLines);
                // Draw segmented lines for past and future, split at dateline
                if (data.past_path && data.past_path.length > 0 && data.path && data.path.length > 0) {
                    const pastPathPoints = data.past_path.map(point => [point.lat, point.lon]);
                    const currentPoint = [data.position.lat, data.position.lon];
                    const futurePathPoints = data.path.map(point => [point.lat, point.lon]);
                    // Past: up to and including current
                    const pastSegments = splitPathAtDateline(pastPathPoints.concat([currentPoint]));
                    pastSegments.forEach(seg => {
                        const l = L.polyline(seg, {
                            color: 'blue',
                            weight: 2,
                            opacity: 0.6,
                            dashArray: '3, 3',
                            smoothFactor: 1
                        }).addTo(map);
                        pastLines.push(l);
                    });
                    // Future: from current to future
                    const futureSegments = splitPathAtDateline([currentPoint].concat(futurePathPoints));
                    futureSegments.forEach(seg => {
                        const l = L.polyline(seg, {
                            color: 'red',
                            weight: 2,
                            opacity: 0.6,
                            dashArray: '3, 3',
                            smoothFactor: 1
                        }).addTo(map);
                        futureLines.push(l);
                    });
                }

            }
            
            // Show results
            resultDiv.classList.remove('d-none');
        })
        .catch(error => {
            // Show error
            errorDiv.textContent = 'Error: ' + error.message;
            errorDiv.classList.remove('d-none');
            resultDiv.classList.add('d-none');
        });
    });
    
    // Trigger form submission on page load with default values
    form.dispatchEvent(new Event('submit'));
});
