const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('./task')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value) {
            if (!validator.isEmail(value)) {
                throw new Error('Email is invalid')
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        validate(value) {
            if (value < 0) {
                throw new Error('age must be a positive number')
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        validate(value) {
            if(!validator.isLength(value , {min:7}) ) {
                throw new Error('Password length must be greater than 6 characters')
            }

            if(value.toLowerCase().includes('password')) {
                throw new Error('Password must not contain the phrase "password"')
            }
        }
    },
    tokens : [{
        token: {
            type: String,
            required: true
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
})

//We use virtual to setup a virtual property for the Model, virtual properties are not stored in the database in that collection, but can be used to setup a relationship between Models.
//the foreignField is the field we setup from the other Model, hence why it's called foreign, it's not local to this Model, here we set its value to owner so we can link it with that property inside of Tasks model, and the localField value is _id because that's what's inside of owner, the id of the local document, the user id.
userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})

// toJSON means that whenever a JSON.stringify() is going to be called on a specific object we can manipulate and change the output of the JSON, so since mongoose calls JSON.stringify on response whenever we call this function res.send({user, token}) <--- here the user is being stringified and turned into JSON, we can change the output of this funcion by using toJSON on .method, since res.send({user, token}) sends that single document.
// difference between .methods and .pre is that we can use .method.myFunction to use that ( myFunction ) on the document instance as we see fit and as needed, while .pre is like an eventListener, we can listen to certain events that happen on the document automatically and do something, like the 'save' event that happens everytime a document is saved.
userSchema.methods.toJSON = function() {
    const user = this

    const userObject = user.toObject()
   
    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar

    return userObject
}

userSchema.methods.generateAuthToken = async function() {
    const user = this
    const token = jwt.sign({_id : user._id.toString()} , process.env.JWT_SECRET)
    user.tokens = user.tokens.concat({token})

    await user.save()
    return token
}

// use statics to create a function that's used on the model ( collection )
// we can use an arrow function here since we don't need to bind this, since we're always targeting the same thing, the User model, unlike with .pre and .methods since there we target the dynamic document from inside the database.
userSchema.statics.findByCredentials = async (email , password) => {
const user = await User.findOne({email})

if(!user) {
    throw new Error('Unable to login')
}

const isMatch = await bcrypt.compare(password , user.password)

if (!isMatch) {
    throw new Error('Unable to login')
}

return user

}

//Hash the plain text password before saving
userSchema.pre('save' , async function(next) {
    const user = this

    if(user.isModified('password')) {
        user.password = await bcrypt.hash(user.password , 8)
    }

    next()
})

userSchema.pre('remove', async function(next) {
const user = this
await Task.deleteMany({ owner: user._id})
next()
})

const User = mongoose.model('User', userSchema )

module.exports = User