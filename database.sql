-- Create required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE users (
    user_id VARCHAR(255) PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL
);

-- Blogs table
CREATE TABLE blogs (
    blog_id SERIAL PRIMARY KEY,
    creator_name VARCHAR(255),
    creator_user_id VARCHAR(255) REFERENCES users(user_id),
    title VARCHAR(255),
    body TEXT,
    date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample users
INSERT INTO users (user_id, password, name)
VALUES
('alex', crypt('Alex123!', gen_salt('bf', 10)), 'Alex Rivera'),
('sam', crypt('Sam123!', gen_salt('bf', 10)), 'Sam Wilson'),
('jordan', crypt('Jordan123!', gen_salt('bf', 10)), 'Jordan Lee');

-- Sample blog posts
INSERT INTO blogs (creator_name, creator_user_id, title, body)
VALUES
('Alex Rivera', 'alex',
 'My First Node.js Application',
 'Today I built my first web application using Node.js and Express.'),

('Sam Wilson', 'sam',
 'Learning PostgreSQL',
 'PostgreSQL allows applications to store and retrieve persistent data using SQL.'),

('Jordan Lee', 'jordan',
 'Why Cybersecurity Matters',
 'Protecting personal information is an essential part of modern web development.'),

('Alex Rivera', 'alex',
 'Understanding Express.js',
 'Express simplifies handling HTTP requests and routing in Node.js applications.'),

('Sam Wilson', 'sam',
 'Building Better Websites',
 'Responsive design ensures websites work across desktops, tablets, and phones.');