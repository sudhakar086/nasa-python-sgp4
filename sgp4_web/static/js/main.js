document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('satelliteForm');
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');

    // Initialize Leaflet map
    let map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    let marker = L.marker([0, 0]).addTo(map);

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
                marker.setLatLng([data.position.lat, data.position.lon]);
                map.setView([data.position.lat, data.position.lon], 3, { animate: true });
                marker.bindPopup(
                    `<b>Satellite Position</b><br>Lat: ${data.position.lat.toFixed(4)}<br>Lon: ${data.position.lon.toFixed(4)}<br>Alt: ${data.position.alt.toFixed(2)} km`
                ).openPopup();
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
