const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../schemas/user.schema');

const createToken = (userId, secret, expiresIn) => jwt.sign({ userId }, secret, { expiresIn });

const signup = async (req, res) => {
    try {
        const { firstName, lastName, phoneNumber, email, username, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Email or username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ firstName, lastName, phoneNumber, email, username, password: hashedPassword });

        const accessToken = createToken(user._id, process.env.JWT_ACCESS_SECRET, '15m');
        const refreshToken = createToken(user._id, process.env.JWT_REFRESH_SECRET, '7d');

        res.status(201).json({
            message: 'User created successfully',
            accessToken,
            refreshToken,
            user: { id: user._id, firstName, lastName, email, username },
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error occurred' });
    }
};

const signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const accessToken = createToken(user._id, process.env.JWT_ACCESS_SECRET, '15m');
        const refreshToken = createToken(user._id, process.env.JWT_REFRESH_SECRET, '7d');

        res.status(200).json({
            message: 'Successfully logged in',
            accessToken,
            refreshToken,
            user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email, username: user.username },
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error occurred' });
    }
};

const verifyToken = (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        res.status(200).json({ message: 'Token verified', userId: decoded.userId });
    } catch (error) {
        const message = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        res.status(401).json({ error: message });
    }
};

module.exports = { signup, signin, verifyToken };
