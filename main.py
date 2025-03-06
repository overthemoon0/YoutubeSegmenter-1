import os
import sys
import logging
from app import app

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Log Python path for debugging
logger.debug("Python Path in main.py:")
for path in sys.path:
    logger.debug(f"  {path}")

if __name__ == "__main__":
    # Log current working directory
    logger.debug(f"Current working directory: {os.getcwd()}")
    app.run(host="0.0.0.0", port=5000, debug=True)