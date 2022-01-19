const express = require('express');
const Task = require('../models/task')
const auth = require('../middleware/auth')
const router = new express.Router()

router.post('/tasks' , auth , async (req , res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    })
    try {
        await task.save()
        res.status(201).send(task)
    } catch(e) {
        res.status(400).send(e)
    }
})
// get all tasks from Task model (mongoose collection)
router.get('/tasks', auth , async (req , res) => {
    const match = {}
    const sort = {}

    if(req.query.completed) {
        match.completed = req.query.completed === 'true'
    }
    if(req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1 
    }
    try {
        // const tasks = await Task.find({owner: req.user._id})
        // What populate does is that it finds the property that you're looking for and instead of returning only that property it "Populates" the result with the whole document associated with that result, we can do .populate('tasks') down below to return all the tasks associated with that user, or we can provide an object with path: 'tasks' which does the same thing but allows us to add more functionality to what we get back, like adding match property which has a value of an object, and inside that object we can provide key:value pair of what we want to populate, for exaple match: { completed: true } will only populate user.tasks with the completed tasks.
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                // parseInt is just a JS funtion that takes a string and converts it into a number, since the query strings are always strings we need to convert them into a number, which is what limit property expects.
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        res.send(req.user.tasks)
    } catch (e) {
        res.status(500).send(e)
    }
})

//get a task by its _id
router.get('/tasks/:id', auth , async (req , res) => {
    const _id = req.params.id
    try {
        const task = await Task.findOne({_id, owner: req.user._id}) //find a task where _id = the params.id and the owner value is = the authenticated owner we get from auth
        if (!task) {
          return  res.status(404).send()
        }
        res.send(task)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.patch('/tasks/:id', auth ,  async (req, res) => {
const updates = Object.keys(req.body)
const allowedUpdates = ['description' , 'completed']
const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

if(!isValidOperation) {
    return res.status(400).send({error: "Invalid updates!"})
}
try {
    const task = await Task.findOne({_id: req.params.id , owner: req.user._id})
    

    if (!task) {
        return res.status(404).send()
    }
    updates.forEach((update) => task[update] = req.body[update])
    await task.save()
    res.send(task)
} catch (e) {
res.status(400).send(e)
}
})

router.delete('/tasks/:id' , auth , async (req , res) => {
    try {
        const task = await Task.findOneAndDelete({_id: req.params.id , owner: req.user._id})
        
        if(!task) {
            return res.status(404).send()
        }
        res.send(task)
    } catch (e) {
        res.status(500).send()
    }
})

module.exports = router