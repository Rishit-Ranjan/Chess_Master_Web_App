-- Chess Master Database Schema
-- Run this SQL to initialize your database

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar TEXT,
    ranking INT DEFAULT 0,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    draws INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Create games table to store game history
CREATE TABLE IF NOT EXISTS games (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_id VARCHAR(255) NOT NULL UNIQUE,
    white_player_id INT,
    black_player_id INT,
    winner_id INT,
    status ENUM('pending', 'active', 'completed', 'abandoned') DEFAULT 'pending',
    time_control INT DEFAULT 10,
    pgn TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    FOREIGN KEY (white_player_id) REFERENCES users(id),
    FOREIGN KEY (black_player_id) REFERENCES users(id),
    FOREIGN KEY (winner_id) REFERENCES users(id)
);
