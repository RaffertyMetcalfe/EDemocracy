CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    Username VARCHAR(16) NOT NULL UNIQUE,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    Role ENUM('Citizen', 'Admin_Level1', 'Admin_Level2') NOT NULL DEFAULT 'Citizen',
    RegistrationTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Posts (
    PostID INT AUTO_INCREMENT PRIMARY KEY,
    AuthorUserID INT NOT NULL,
    PostType ENUM('Announcement', 'Poll', 'Discussion', 'VoteItem') NOT NULL,
    Title VARCHAR(255) NOT NULL,
    Content TEXT,
    CreationTimestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (AuthorUserID) REFERENCES Users(UserID)
);

CREATE TABLE PollOptions (
    OptionID INT AUTO_INCREMENT PRIMARY KEY,
    PostID INT NOT NULL,
    OptionText VARCHAR(255) NOT NULL,
    VoteCount INT NOT NULL DEFAULT 0,
    FOREIGN KEY (PostID) REFERENCES Posts(PostID) ON DELETE CASCADE
);

CREATE TABLE Votes (
    VoteID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    PostID INT NOT NULL,
    OptionID INT NOT NULL,
    Timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID),
    FOREIGN KEY (PostID) REFERENCES Posts(PostID) ON DELETE CASCADE,
    FOREIGN KEY (OptionID) REFERENCES PollOptions(OptionID) ON DELETE CASCADE,
    UNIQUE KEY user_vote_per_poll (UserID, PostID) -- This prevents a user from voting twice on the same poll
);