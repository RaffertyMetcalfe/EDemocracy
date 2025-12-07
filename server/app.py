import os
# Flask: https://flask.palletsprojects.com/
from flask import Flask, jsonify, request, make_response
# python-dotenv: https://pypi.org/project/python-dotenv/
from dotenv import load_dotenv
# mysql-connector-python: https://dev.mysql.com/doc/connector-python/en/
import mysql.connector
# bcrypt: https://pypi.org/project/bcrypt/
import bcrypt
# Flask-CORS: https://flask-cors.readthedocs.io/
from flask_cors import CORS
# PyJWT: https://pyjwt.readthedocs.io/
import jwt
import datetime
from functools import wraps
# (local module)
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
      "exp": datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=30)
    }
    token = jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")
    return jsonify({"message": "Login successful", "token": token}), 200
  else:
    return make_response(jsonify({"error": "Invalid email or password"}), 401)

@app.route('/api/profile')
@token_required
def get_profile(current_user_id):
    user = db_queries.get_user_profile_by_id(current_user_id)
    if not user:
        return make_response(jsonify({"error": "User not found"}), 404)
    return jsonify({"user": user}), 200
        
@app.route('/api/posts', methods=['POST'])
@token_required
def create_post(current_user_id):
    data = request.get_json()
    post_type = data.get('postType')
    if post_type == 'Poll':
        title = data.get('title')
        options = data.get('options')

        if not title or not options or not isinstance(options, list) or len(options) < 2:
            return make_response(jsonify({"error": "A poll must have a title and at least two options."}), 400)

        if db_queries.create_poll(current_user_id, title, options):
            return jsonify({"message": "Poll created successfully"}), 201
        else:
            return make_response(jsonify({"error": "Failed to create poll"}), 500)
          
    elif post_type == 'Announcement':
      title = data.get('title')
      content = data.get('content')
      if not content:
        return make_response(jsonify({"error": "Announcement content is required."}), 400)
      db_queries.create_announcement(current_user_id, title, content)
      return jsonify({"message": "Announcement created successfully"}), 201
    
    elif post_type == 'ForumTopic':
        title = data.get('title')
        content = data.get('content') if data.get('content') else ''
        db_queries.create_forum_topic(current_user_id, title, content)
        return jsonify({"message": "Forum topic created successfully"}), 201
      
    elif post_type == 'VoteItem':
      title = data.get('title')
      if db_queries.create_vote_item(current_user_id, title):
        return jsonify({"message": "Vote item created successfully"}), 201
      else:
        return make_response(jsonify({"error": "Failed to create vote item"}), 500)
    else:
        return make_response(jsonify({"error": "Invalid or missing 'postType'."}), 400)
      
@app.route('/api/feed', methods=['GET'])
@token_required
def get_feed(current_user_id):
  feed_data = db_queries.get_feed_posts(current_user_id)
  return jsonify(feed_data), 200

@app.route('/api/vote', methods=['POST'])
@token_required
def cast_vote(current_user_id):
    data = request.get_json()
    post_id = data.get('PostId')
    option_id = data.get('OptionId')

    if not post_id or not option_id:
        return make_response(jsonify({"error": "Missing PostId or OptionId"}), 400)

    if db_queries.record_poll_vote(current_user_id, post_id, option_id):
        return jsonify({"message": "Vote cast successfully"}), 202
    else:
        return make_response(jsonify({"error": "Failed to cast vote"}), 500)

@app.route('/api/item-votes', methods=['POST'])
@token_required
def cast_item_vote(current_user_id):
  data = request.get_json()
  post_id_str = data.get('PostId')
  choice = data.get('Choice')
  auth_token = data.get('AuthToken')
  
  if not all([post_id_str, choice, auth_token]):
    return make_response(jsonify({"error": "Missing PostId, Choice, or AuthToken"}), 400)
  
  try:
    post_id = int(post_id_str)
    decoded_token = jwt.decode(auth_token, app.config['SECRET_KEY'], algorithms=["HS256"])
    
    if decoded_token['user_id'] != current_user_id:
      return make_response(jsonify({"error": "Invalid user ID in token"}), 403)
    
    if decoded_token['post_id'] != post_id:
      return make_response(jsonify({"error": "Post ID mismatch"}), 403)
    
    if decoded_token['purpose'] != 'item_vote':
      return make_response(jsonify({"error": "Invalid token purpose"}), 403)

    if db_queries.record_item_vote(current_user_id, post_id, choice):
      return jsonify({"message": "Vote recorded successfully"}), 202
    else:
      return make_response(jsonify({"error": "Failed to record vote"}), 500)
      
  except jwt.ExpiredSignatureError:
    return make_response(jsonify({"error": "Vote token has expired"}), 401)
  except jwt.InvalidTokenError:
      return make_response(jsonify({"error": "Vote token is invalid"}), 401)
  except ValueError:
    return make_response(jsonify({"error": "Invalid PostId format"}), 400)
  except Exception as e:
    print(f"An unexpected error occurred in cast_item_vote: {e}")
    return make_response(jsonify({"error": "An internal server error occurred"}), 500)

@app.route('/api/comments', methods=['POST'])
@token_required
def post_comment(current_user_id):
    data = request.get_json()
    post_id = data.get('postId')
    content = data.get('content')
    
    if not post_id or not content:
        return make_response(jsonify({"error": "Missing data"}), 400)

    if db_queries.create_comment(current_user_id, post_id, content):
        return jsonify({"message": "Comment added"}), 201
    else:
        return make_response(jsonify({"error": "Failed"}), 500)

@app.route('/api/posts/<int:post_id>/comments', methods=['GET'])
@token_required
def get_post_comments(current_user_id, post_id):
    # Get page number from query string, default to 1
    page = request.args.get('page', 1, type=int)
    per_page = 5 # Number of comments to load per click
    offset = (page - 1) * per_page

    comments = db_queries.get_comments_by_post(post_id, per_page, offset)
    
    return jsonify({
        "comments": comments,
        "page": page,
        "next_page": page + 1 if len(comments) == per_page else None
    }), 200

if __name__ == '__main__':
  app.run(debug=True, port=5000)