const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../schemas/user.schema');

const signup = async (req, res) => {
    try {
        const { firstName, lastName, phoneNumber, email, username, password } = req.body;

        const existingUser = await User.findOne({ 
            $or: [
                { email },
                { username }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: 'Bunday email yoki username mavjud' 
            });
        }

        // Parolni hashlash
        const hashedPassword = await bcrypt.hash(password, 10);

        // Yangi foydalanuvchi yaratish
        const user = await User.create({
            firstName,
            lastName, 
            phoneNumber,
            email,
            username,
            password: hashedPassword
        });

        // Access va Refresh tokenlarni yaratish
        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Foydalanuvchi muvaffaqiyatli yaratildi',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Ro\'yxatdan o\'tishda xatolik:', error);
        res.status(500).json({ 
            error: 'Server xatosi yuz berdi' 
        });
    }
};

const signin = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Noto\'g\'ri username yoki parol' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Noto\'g\'ri username yoki parol' 
            });
        }

        const accessToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).json({
            message: 'Muvaffaqiyatli kirildi',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Kirishda xatolik:', error);
        res.status(500).json({ 
            error: 'Server xatosi yuz berdi' 
        });
    }
};

module.exports = {
    signup,
    signin
};
