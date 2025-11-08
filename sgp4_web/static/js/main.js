document.addEventListener('DOMContentLoaded', function() {
    // Initialize map
    const map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    let satelliteMarker = null;
    let pathLine = null;

    // Form submission
    document.getElementById('satelliteForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const result = document.getElementById('result');
        const error = document.getElementById('error');

        try {
            const response = await fetch('/calculate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    line1: document.getElementById('line1').value,
                    line2: document.getElementById('line2').value
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Calculation failed');

            // Update position display
            result.classList.remove('d-none');
            error.classList.add('d-none');
            
            document.getElementById('posX').textContent = data.position.x.toFixed(2);
            document.getElementById('posY').textContent = data.position.y.toFixed(2);
            document.getElementById('posZ').textContent = data.position.z.toFixed(2);
            document.getElementById('velocity').textContent = Math.sqrt(
                data.velocity.x**2 + data.velocity.y**2 + data.velocity.z**2
            ).toFixed(2);
            document.getElementById('timestamp').textContent = new Date(data.timestamp).toLocaleString();

            // Update map
            if (satelliteMarker) map.removeLayer(satelliteMarker);
            if (pathLine) map.removeLayer(pathLine);

            satelliteMarker = L.marker([data.position.lat, data.position.lon])
                .bindPopup(`Altitude: ${data.position.alt.toFixed(2)} km`)
                .addTo(map);

            const pathCoords = [
                ...data.past_path.map(p => [p.lat, p.lon]),
                [data.position.lat, data.position.lon],
                ...data.path.map(p => [p.lat, p.lon])
            ];
            
            pathLine = L.polyline(pathCoords, {
                color: 'red',
                weight: 2,
                opacity: 0.8
            }).addTo(map);

            map.setView([data.position.lat, data.position.lon]);
        } catch (err) {
            result.classList.add('d-none');
            error.classList.remove('d-none');
            error.textContent = err.message;
        }
    });

    // TLE Management
    document.getElementById('saveTleButton').addEventListener('click', async function() {
        const name = prompt('Enter a name for this TLE:');
        if (!name) return;

        try {
            const response = await fetch('/api/tles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    line1: document.getElementById('line1').value,
                    line2: document.getElementById('line2').value
                })
            });

            if (!response.ok) throw new Error('Failed to save TLE');
            alert('TLE saved successfully');
        } catch (err) {
            alert('Error saving TLE: ' + err.message);
        }
    });

    // Trigger initial calculation
    document.getElementById('satelliteForm').dispatchEvent(new Event('submit'));
});
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            };
            let istString = date.toLocaleString('en-IN', options).replace(',', '');
            // Capitalize am/pm to AM/PM if present
            istString = istString.replace(/(am|pm)/, function(m) { return m.toUpperCase(); });
            document.getElementById('timestamp').textContent = istString + ' IST';
            
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

    // --- TLE Management Functions ---

    async function fetchAndDisplayTles() {
        try {
            const response = await fetch('/api/tles');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const tles = await response.json();

            tleListUl.innerHTML = ''; // Clear existing list
            if (tles.length === 0) {
                noTlesMessage.classList.remove('d-none');
            } else {
                noTlesMessage.classList.add('d-none');
                tles.forEach(tle => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item d-flex justify-content-between align-items-center tle-item';
                    li.innerHTML = `
                        <div>
                            <h6 class="my-0">${tle.name}</h6>
                            <small class="text-muted">${tle.line1.substring(0,20)}...</small>
                        </div>
                        <button class="btn btn-sm btn-danger delete-tle-btn" data-id="${tle.id}">Delete</button>
                    `;
                    li.addEventListener('click', (e) => {
                        if (e.target.classList.contains('delete-tle-btn')) return; // Don't load if delete was clicked
                        line1Input.value = tle.line1;
                        line2Input.value = tle.line2;
                        currentLoadedTleId = tle.id; // Keep track of loaded TLE
                        form.dispatchEvent(new Event('submit')); // Recalculate
                        manageTlesModal.hide();
                        // Consider changing "Save TLE" to "Update TLE" here if desired
                    });
                    tleListUl.appendChild(li);
                });

                // Add event listeners to delete buttons
                document.querySelectorAll('.delete-tle-btn').forEach(button => {
                    button.addEventListener('click', async (e) => {
                        e.stopPropagation(); // Prevent li click event
                        const tleId = e.target.dataset.id;
                        if (confirm('Are you sure you want to delete this TLE?')) {
                            await deleteTle(tleId);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error fetching TLEs:', error);
            tleListUl.innerHTML = '<li class="list-group-item text-danger">Error loading TLEs.</li>';
            noTlesMessage.classList.add('d-none');
        }
    }

    async function saveTle() {
        const name = prompt("Enter a name for this TLE:", "My Satellite");
        if (!name) return; // User cancelled or entered nothing

        const line1 = line1Input.value;
        const line2 = line2Input.value;

        try {
            const response = await fetch('/api/tles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, line1, line2 })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const newTle = await response.json();
            alert(`TLE "${newTle.name}" saved successfully!`);
            currentLoadedTleId = newTle.id; // Mark this as the current TLE
            // Optionally, refresh TLE list if modal is open or next time it's opened
        } catch (error) {
            console.error('Error saving TLE:', error);
            alert(`Error saving TLE: ${error.message}`);
        }
    }

    async function deleteTle(tleId) {
        try {
            const response = await fetch(`/api/tles/${tleId}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            alert('TLE deleted successfully.');
            if (currentLoadedTleId === parseInt(tleId)) {
                currentLoadedTleId = null; // Clear if the deleted TLE was the one loaded
            }
            fetchAndDisplayTles(); // Refresh list in modal
        } catch (error) {
            console.error('Error deleting TLE:', error);
            alert(`Error deleting TLE: ${error.message}`);
        }
    }

    // Event Listeners for TLE Management
    saveTleButton.addEventListener('click', saveTle);
    manageTlesButton.addEventListener('click', fetchAndDisplayTles); // Load TLEs when modal is about to be shown

    // Clear currentLoadedTleId if user manually changes TLE lines
    line1Input.addEventListener('input', () => currentLoadedTleId = null);
    line2Input.addEventListener('input', () => currentLoadedTleId = null);

});
