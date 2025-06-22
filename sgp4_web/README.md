# SGP4 Satellite Tracker Web Interface

A web-based interface for the SGP4 satellite propagation library, allowing you to calculate satellite positions using Two-Line Element (TLE) data.

## Features

- Calculate satellite position and velocity in real-time
- Clean, responsive web interface
- Pre-loaded with the International Space Station (ISS) TLE as an example
- Easy to use with any valid TLE data

## Prerequisites

- Python 3.6+
- pip (Python package manager)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/brandon-rhodes/python-sgp4.git
   cd python-sgp4/sgp4_web
   ```

2. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

1. Start the web server:
   ```bash
   python app.py
   ```

2. Open your web browser and navigate to:
   ```
   http://127.0.0.1:5000/
   ```

3. Enter TLE data or use the default ISS TLE

4. Click "Calculate Position" to see the satellite's current position and velocity

## Example TLE

The application comes pre-loaded with the ISS TLE as an example:

```
1 25544U 98067A   24001.28849769  .00018687  00000-0  27518-3 0  9993
2 25544  51.6405 111.6188 0006072 255.5622 104.4138 15.49890031451356
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [SGP4 Library](https://github.com/brandon-rhodes/python-sgp4)
- [Flask](https://flask.palletsprojects.com/)
- [Bootstrap](https://getbootstrap.com/)
