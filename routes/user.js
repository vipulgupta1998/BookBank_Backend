const express = require('express');
const router = express.Router();
const User = require("../models/user")
const Book = require("../models/book")

/********************************* Get user information ***************************/

router.get("/user", async (req, res) => {
    try {
      const userId = req.body.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ user });
    } catch (error) {
      res.status(500).json({ message: 'Error retrieving user data', error });
    }
  });
  

/********************************* Find all the requests ***************************/

router.get("/allRequests",async(req,res)=>{
    try {
        const userId = req.body.id;
    
        const user = await User.findById(userId)
          .populate('requestHistory.bookId') 
          .populate('requestHistory.requestedBy', 'name') 
          .lean();
    
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        const incompleteRequests = user.requestHistory.filter(request => !request.completed);
        const completedRequests = user.requestHistory.filter(request => request.completed);

        const sortedIncompleteRequests = incompleteRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const sortedCompletedRequests = completedRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const sortedRequests = [...sortedIncompleteRequests, ...sortedCompletedRequests];
    
        res.status(200).json({ requestHistory: sortedRequests });
      } catch (error) {
        res.status(500).json({ message: 'Error retrieving request history', error });
      }
    
})

module.exports = router;