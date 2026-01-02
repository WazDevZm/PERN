import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { protect } from '../middleware/auth.js';


const router = express.Router();

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
    const { name, email, password } = req.body;
    
    if (!name) {
        return res.status(400).json({ message: 'Please provide name' });
    }
    if (!email) {
        return res.status(400).json({ message: 'Please provide email' });
    }
    if (!password) {
        return res.status(400).json({ message: 'Please provide password' });
    }

    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userExists.rows.length > 0) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
        [name, email, hashedPassword]
    );

    const token = generateToken(newUser.rows[0]);

    res.cookie('token', token, cookieOptions);

    const created = newUser.rows[0];
    return res.status(201).json({ user: { id: created.id, name: created.name, email: created.email } });
});

// Login (accepts either email or name with password)
router.post('/login', async (req, res) => {
    const { email, name, password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'Please provide password' });
    }

    if (!email && !name) {
        return res.status(400).json({ message: 'Please provide email or name' });
    }

    const identifier = email || name;
    const lookupField = email ? 'email' : 'name';

    const user = await pool.query(`SELECT * FROM users WHERE ${lookupField} = $1`, [identifier]);

    if (user.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const userData = user.rows[0];

    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(userData.id);

    res.cookie('token', token, cookieOptions);

    res.json({ user: { id: userData.id, name: userData.name, email: userData.email } });
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
