import os
from flask import Flask, jsonify, request, make_response
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
import bcrypt
from flask_cors import CORS
import jwt
import datetime

# Create an instance of a Flask application
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')

load_dotenv()

def get_db_connection():
    try:
      port_num = int(os.getenv('DB_PORT'))
      conn = mysql.connector.connect(
          host=os.getenv('DB_HOST'),
          port=port_num,
          user=os.getenv('DB_USER'),
          password=os.getenv('DB_PASSWORD'),
          database=os.getenv('DB_NAME'),
      )
      return conn
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

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
  if not username:
    return make_response(jsonify({"error": "Missing username"}), 400)
  if not email:
    return make_response(jsonify({"error": "Missing email"}), 400)
  if not password:
    return make_response(jsonify({"error": "Missing password"}), 400)
  
  password_bytes = password.encode('utf-8')
  hashed_password = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
  
  conn = get_db_connection()
  if not conn:
    return make_response(jsonify({"error": "Database connection failed"}), 500)
  
  cursor = conn.cursor()
  try:
    cursor.execute("INSERT INTO users (Username, Email, PasswordHash) VALUES (%s, %s, %s)", (username, email, hashed_password))
    conn.commit()
    return jsonify({"message": "User registered successfully"}), 201
  except mysql.connector.Error as err:
    if err.errno == 1062:
      print(f"Error: {err}")
      cursor.execute("SELECT 1 FROM users WHERE Username = %s", (username,))
      if cursor.fetchone():
        return make_response(jsonify({"error": "Username already exists in the database"}), 409)
      cursor.execute("SELECT 1 FROM users WHERE Email = %s", (email,))
      if cursor.fetchone():
        return make_response(jsonify({"error": "Email already exists in the database"}), 409)
    else:
      print(f"Error: {err}")
      return make_response(jsonify({"error": f"Failed to register user: {err}"}), 500)
  finally:
    cursor.close()
    conn.close()
    
@app.route('/api/users/login', methods=['POST'])
def login_user():
  data = request.get_json()
  email = data.get('email')
  password = data.get('password')
  
  if not email:
    return make_response(jsonify({"error": "Missing email"}), 400)
  if not password:
    return make_response(jsonify({"error": "Missing password"}), 400)
  
  conn = get_db_connection()
  if not conn:
    return make_response(jsonify({"error": "Database connection failed"}), 500)
  
  cursor = conn.cursor()
  try:
    cursor.execute("SELECT PasswordHash FROM users WHERE Email = %s", (email,))
    result = cursor.fetchone()
    cursor.execute("SELECT UserID FROM users WHERE Email = %s", (email,))
    id = cursor.fetchone()
    
    if result is None:
      return make_response(jsonify({"error": "Invalid email or password"}), 401)
    
    stored_password_hash = result[0]
    
    if bcrypt.checkpw(password.encode('utf-8'), stored_password_hash.encode('utf-8')):
      payload = {
        "user_id": id,
        "expiry": (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)).isoformat()
      }
      token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
      return jsonify({"message": "Login successful", "token": token}), 200
    else:
      return make_response(jsonify({"error": "Invalid email or password"}), 401)
  
  except mysql.connector.Error as err:
    print(f"Error: {err}")
    return make_response(jsonify({"error": f"Failed to login user: {err}"}), 500)
  
  finally:
    cursor.close()
    conn.close()    

if __name__ == '__main__':
  app.run(debug=True, port=5000)