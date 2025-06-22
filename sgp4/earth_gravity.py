"""
Earth gravity models for use with the SGP4 satellite propagation algorithm.

This module provides predefined Earth gravity models (WGS72, WGS84) that are essential
for accurate satellite orbit propagation. Each model contains gravitational constants
and Earth parameters that affect satellite motion.
"""

from collections import namedtuple
from sgp4.propagation import getgravconst

# Define a named tuple to store Earth gravity model parameters
# Parameters include:
#   - tumin: Minutes in one time unit
#   - mu: Earth's gravitational parameter (km³/s²)
#   - radiusearthkm: Earth's radius in kilometers
#   - xke: Square root of the Earth's gravitational parameter
#   - j2, j3, j4: Zonal harmonic coefficients
#   - j3oj2: Ratio of J3 to J2
EarthGravity = namedtuple(
    'EarthGravity',
    'tumin mu radiusearthkm xke j2 j3 j4 j3oj2',
    )

# Predefined gravity models
# These are the standard Earth gravity models used in satellite orbit calculations:
# - wgs72old: Older WGS72 model
# - wgs72: Standard WGS72 model
# - wgs84: Current standard WGS84 model (most accurate)
wgs72old = EarthGravity(*getgravconst('wgs72old'))
wgs72 = EarthGravity(*getgravconst('wgs72'))
wgs84 = EarthGravity(*getgravconst('wgs84'))
