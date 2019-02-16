const express       = require('express');
const router        = express.Router();
const jwt           = require('jsonwebtoken');
const userService   = require('./user.service');

// routes
router.post('/authenticate', authenticate);

module.exports = router;

function authenticate(req, res, next) {
    userService.authenticate(req)
        .then(user => {
            if (user) {
                let token = jwt.sign({ id: user.id, username: user.username }, req.jwt_secret, { expiresIn: '1d' });
                res.status(200).send({ auth: true, token: token, user: user });
            } else {
                 res.status(400).json({ message: 'Username or password is incorrect' });
            }
        })
        .catch(err => next(err));
}
