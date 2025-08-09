import os
import mysql.connector
from mysql.connector import Error

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

def find_user_by_email(email):
    conn = get_db_connection()
    if not conn:
        return None
    
    user_record = None
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT UserID, PasswordHash FROM users WHERE Email = %s", (email,))
        user_record = cursor.fetchone() # Fetches one record, e.g., (1, 'some_hash_string')
    except Error as e:
        print(f"Error in find_user_by_email: {e}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
    return user_record

def create_user(username, email, hashed_password):
    conn = get_db_connection()
    if not conn:
        return False
        
    success = False
    try:
        cursor = conn.cursor()
        cursor.execute("INSERT INTO users (Username, Email, PasswordHash) VALUES (%s, %s, %s)", (username, email, hashed_password))
        conn.commit()
        success = True
    except Error as e:
        print(f"Error in create_user: {e}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
    return success

def get_user_profile_by_id(user_id):
    conn = get_db_connection()
    if not conn:
        return None

    user_profile = None
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT UserID, Username, Email, RegistrationTimestamp FROM users WHERE UserID = %s", (user_id,))
        user_profile = cursor.fetchone()
    except Error as e:
        print(f"Error in get_user_profile_by_id: {e}")
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
    return user_profile