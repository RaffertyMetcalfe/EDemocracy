import os
from flask import Flask, jsonify, request, make_response
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import Error
import bcrypt

# Create an instance of a Flask application
app = Flask(__name__)

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
  if not username or not email or not password:
    return make_response(jsonify({"error": "Missing username, email, or password"}), 400)
  
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
      return make_response(jsonify({"error": "Username or email already exists"}), 409)
    else:
      print(f"Error: {err}")
      return make_response(jsonify({"error": f"Failed to register user: {err}"}), 500)
  finally:
    cursor.close()
    conn.close()
    
if __name__ == '__main__':
  app.run(debug=True, port=5000)