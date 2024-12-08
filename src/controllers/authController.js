const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../schemas/user.schema');

const signup = async (req, res) => {
    try {
        const { firstName, lastName, phoneNumber, email, username, password } = req.body;

        const existingUser = await User.findOne({ 
            $or: [
                { email },
                { email }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ 
                error: 'Bunday email yoki email mavjud' 
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
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(401).json({ 
                error: 'Noto\'g\'ri email yoki parol' 
            });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Noto\'g\'ri email yoki parol' 
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

const verifyToken = async (req, res) => {
    try {
        console.log('xey');
        const { token } = req.body; // Tokenni so'rov bodydan olish (yoki headersdan)

        if (!token) {
            return res.status(400).json({
                error: 'Token kiritilmagan',
            });
        }

        // Tokenni tekshirish
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        res.status(200).json({
            message: 'Token tasdiqlandi',
            userId: decoded.userId,
        });
    } catch (error) {
        console.error('Tokenni tasdiqlashda xatolik:', error);

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token muddati tugagan' 
            });
        }

        res.status(401).json({
            error: 'Noto\'g\'ri token',
        });
    }
};

module.exports = {
    signup,
    signin,
    verifyToken
};
