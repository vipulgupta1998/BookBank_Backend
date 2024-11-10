const express = require('express');
const router = express.Router();
const Book = require("../models/book")
const User = require("../models/user")
const fetchUser = require("../middleware/fetchUser")

/********************************* Find all books ***************************/

router.get("/findAllBooks",async(req,res)=>{
    try {
       const userId = req.body._id;
       const books = await Book.find();
       res.json(books);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching books', error });
    }
})

/********************************* Search the books ***************************/

router.post("/SearchBook", async (req, res) => {
  try {
    const { tag, query } = req.body;
    let searchCondition = {};
    if (tag === "author") {
      searchCondition = { author: { $regex: query, $options: 'i' } };
    } else if (tag === "title") {
      searchCondition = { title: { $regex: query, $options: 'i' } };
    } else if (tag === "genre") {
      searchCondition = { genre: { $regex: query, $options: 'i' } };
    } else {
      searchCondition = {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { author: { $regex: query, $options: 'i' } },
          { genre: { $regex: query, $options: 'i' } }
        ]
      };
    }
    const books = await Book.find(searchCondition);
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching books', error });
  }
});


/********************************* Get all books of user ***************************/

router.get("/user/:type",fetchUser,async(req,res)=>{
    try {
      const type = req.params.type;
      const userId = req.user.id;
      let books;
      if(type && type=="all"){
        books = await Book.find({ owner: userId });
      }else{
        books = await Book.find({ requestedBy : userId});
      }
    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching books', error });
  }
})

/********************************* Add the books ***************************/

router.post("/addBook",fetchUser,async(req,res)=>{
    try {
        const {title, author, genre, description, condition, coverImageUrl } = req.body;
        const owner = req.user.id;
        if (!owner || !title || !author || !condition || !coverImageUrl) {
          return res.status(400).json({ success:false, message: 'Owner, title, author, and condition are required fields.' });
        }
        const newBook = new Book({
          owner,
          title,
          author,
          genre,
          description,
          condition,
          coverImageUrl,
        });
        const savedBook = await newBook.save();
        res.status(201).json({ success : true,message: 'Book added successfully!' });
      } catch (error) {
        res.status(500).json({ success : false,message: 'Error adding book', error });
      }
})


/********************************* List the book for sale ***************************/

router.post("/listBook",async(req,res)=>{
    try {
        const { bookId } = req.body;
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({ success:false,message: 'Book not found' });
        }
        if(book.status == "own"){
          book.status = "available";
        }
        else{
          book.status = 'own';
          book.requestedBy = null;
          await User.updateOne(
            { _id: book.owner },
            { $pull: { requestHistory: { bookId: bookId } } }
          );
        }
        await book.save();
        res.status(200).json({ success : true,message: 'Book status updated to available', book });
      } catch (error) {
        res.status(500).json({success:false, message: 'Error listing book', error });
      }
})

/********************************* Delete the book ***************************/

router.delete("/deleteBook/:id",fetchUser,async(req,res)=>{
    try {
        const id = req.params.id;
        const userId = req.user.id;
        await User.updateOne(
          { _id: userId },
          { $pull: { requestHistory: { bookId: id } } }
        );
        const deletedBook = await Book.findByIdAndDelete(id);
        if (!deletedBook) {
          return res.status(404).json({success:false, message: 'Book not found.' });
        }
        res.json({ success:true , message: 'Book deleted successfully!' });
      } catch (error) {
        res.status(500).json({ success:false, message: 'Error deleting book', error });
      }
})


/********************************* Request Book ***************************/

router.post("/requestBook",fetchUser,async(req,res)=>{
   try {
    const { bookId } = req.body;
    const requestedBy = req.user.id;
    const book = await Book.findById(bookId);
    let success = false;
    if (!book) {
      return res.status(404).json({success, message: 'Book not found' });
    }
    if(book.requestedBy != null){
      return res.status(404).json({success,message:"Book already requested"});
    }
    const ownerId = book.owner.toString();
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({success,message: 'Owner not found' });
    }
    owner.requestHistory.push({
      bookId,
      requestedBy
    });
    await owner.save();
    book.requestedBy = requestedBy;
    await book.save();
    success = true;
    res.status(200).json({success, message: 'Request added to owner\'s request history successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing request', error });
  }
})

/********************************* Give permission to request ***************************/

router.post("/grantRequest",async(req,res)=>{
    try {
        const { bookId, owner, newOwner } = req.body;
        console.log(req.body);
        const currentOwner = await User.findById(owner);
        if (!currentOwner) {
          return res.status(404).json({ message: 'Current owner not found' });
        }
        const request = currentOwner.requestHistory.find(
          entry => entry.bookId.equals(bookId)
        );
        if (!request) {
          return res.status(404).json({ message: 'Request not found or already completed' });
        }
        request.completed = true;
        await currentOwner.save();
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({ message: 'Book not found' });
        }
        book.owner = newOwner;
        book.status = "own";
        book.requestedBy = null;
        await book.save();
    
        res.status(200).json({ message: 'Request granted and book ownership transferred successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Error processing request', error });
      }
    });


/********************************* Deny permission to request ***************************/

router.post("/rejectRequests",async(req,res)=>{
  try {
    const {bookId, owner} = req.body;
    const currentOwner = await User.findById(owner);
        if (!currentOwner) {
          return res.status(404).json({ message: 'Current owner not found' });
        }
    
        const request = currentOwner.requestHistory.find(
          entry => entry.bookId.equals(bookId)
        );
        if (!request) {
          return res.status(404).json({ message: 'Request not found or already completed' });
        }
        request.completed = true;
        await currentOwner.save();
      const book = await Book.findById(bookId);
      if (!book) {
        return res.status(404).json({ message: 'Book not found' });
      }
      book.requestedBy = null;
      await book.save();
      res.status(200).json({ message: 'Request rejected' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing request', error });
  }
})
module.exports = router;