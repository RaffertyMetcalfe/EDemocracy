from flask import Flask

# Create an instance of a Flask application
app = Flask(__name__)

# Define an endpoint using a decorator
@app.route('/api')
def hello_world():
  # Whatever this function returns is sent back to the client
  return "Hello World from the API!"

if __name__ == '__main__':
  # Start the server in debug mode on port 5000
  app.run(debug=True, port=5000)