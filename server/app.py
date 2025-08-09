import os
from flask import Flask, jsonify, request, make_response
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
import bcrypt
from flask_cors import CORS
import jwt
import datetime
from functools import wraps
import db_queries

load_dotenv()

# Create an instance of a Flask application
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

# Decorator to make certain routes require a valid token
def token_required(func):
    # https://docs.python.org/3/library/functools.html#functools.wraps
    @wraps(func)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            # The header format is "Bearer <token>"
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except:
                return make_response(jsonify({"error": "Token is in incorrect format!"}), 401)

        # If the token is not found, return an error
        if not token:
            return make_response(jsonify({"error": "Token is missing!"}), 401)

        # Try to decode the token to verify it
        try:
            # Verify the token using secret key
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            # Get the user's data from the token's payload
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return make_response(jsonify({"error": "Token has expired!"}), 401)
        except jwt.InvalidTokenError:
            return make_response(jsonify({"error": "Token is invalid!"}), 401)
        except jwt.DecodeError:
            return make_response(jsonify({"error": "Token could not be decoded!"}), 401)

        # If the token is valid, execute the original route function and pass the user's ID to it
        return func(current_user_id, *args, **kwargs)

    return decorated

# Define an endpoint using a decorator
@app.route('/api')
def hello_world():
  # Whatever this function returns is sent back to the client
  return jsonify({"message": "Hello World from the API!"})

# Registration route
@app.route('/api/users/register', methods=['POST'])
def register_user():
  data = request.get_json()
  username = data.get('username')
  email = data.get('email')
  password = data.get('password')

  if not all([username, email, password]):
    return make_response(jsonify({"error": "Missing required fields"}), 400)

  password_bytes = password.encode('utf-8')
  hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt())

  try:
    if db_queries.create_user(username, email, hashed_password):
      return jsonify({"message": "User registered successfully"}), 201
    else:
      return make_response(jsonify({"error": "An unknown error occurred"}), 500)
  except mysql.connector.Error as err:
    if err.errno == 1062: # Duplicate entry
      return make_response(jsonify({"error": "Username or Email already exists"}), 409)
    else:
      return make_response(jsonify({"error": f"Database error: {err}"}), 500)
    
@app.route('/api/users/login', methods=['POST'])
def login_user():
  data = request.get_json()
  email = data.get('email')
  password = data.get('password')

  if not email or not password:
    return make_response(jsonify({"error": "Missing email or password"}), 400)

  user_record = db_queries.find_user_by_email(email)

  if user_record is None:
    return make_response(jsonify({"error": "Invalid email or password"}), 401)

  user_id, stored_password_hash = user_record

  if bcrypt.checkpw(password.encode('utf-8'), stored_password_hash.encode('utf-8')):
    payload = {
      "user_id": user_id,
        "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({"message": "Login successful", "token": token}), 200
  else:
    return make_response(jsonify({"error": "Invalid email or password"}), 401)

@app.route('/api/profile')
@token_required
def get_profile(current_user_id):
    conn = get_db_connection()
    if not conn:
        return make_response(jsonify({"error": "Database connection failed"}), 500)
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT UserID, Username, Email, RegistrationTimestamp FROM users WHERE UserID = %s", (current_user_id,))
        user = cursor.fetchone()
        if not user:
            return make_response(jsonify({"error": "User not found"}), 404)
        return jsonify({"user": user}), 200
    except Error as e:
        print(f"Error: {e}")
        return make_response(jsonify({"error": "Failed to fetch profile"}), 500)
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
  app.run(debug=True, port=5000)