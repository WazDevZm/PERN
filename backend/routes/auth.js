import expess from 'express';
import bycrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { protect } from '../middleware/auth.js';


const router = expess.Router();

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
};

const generateToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: '1d',
    });
}
// Register-
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide username, email and password' });
    }

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userExists.rows.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bycrypt.hash(password, 10);

    const newUser = await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
        [username, email, hashedPassword]
    );

    const token = generateToken(newUser.rows[0]);

    res.cookie('token', token, cookieOptions);

    return res.status(201).json({ user: newUser.rows[0]});
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (user.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const userData = user.rows[0];

    const isMatch = await bycrypt.compare(password, user.rows[0].password);

    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(userData.id);

    res.cookie('token', token, cookieOptions);

    res.json({ user: {id: userData.id, username: userData.username, email: userData.email} });
});

// Me

router.get('/me', protect, async (req, res) => {
    res.json(req.user);
    // return s the info of the loogied in use
});

// Logout
router.post('/logout', (req, res) => {
    res.cookie('token', '', { ...cookieOptions, maxAge: 1 });
    res.json({ message: 'Logged out successfully' });
});

export default router;
