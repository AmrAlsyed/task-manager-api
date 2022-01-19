const jwt = require('jsonwebtoken')
const User = require('../models/user')
//Middlewares are functions that can run in the middle of a router endpoint, so whenever a RESTAPI is called, we can choose to use a middleware to do something before continuing ( calling next() ) such as grabbing data from the req and doing something with it before continuing, please note that middlewares are different from .pre, .methods and .statics, since these are 1- called on the Model Schema inside the Model file, 2- are used on the Model/Document instance not the router endpoint, 3- and don't need to be loaded in (required) in the Router file in order to be used.
const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ','')
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findOne({_id: decoded._id , 'tokens.token' : token})

        if(!user) {
            throw new Error()
        }

        req.token = token
        req.user = user
        next()
    } catch (e) {
        res.status(401).send({error: 'Please authenticate.'})
    }
}

module.exports = auth