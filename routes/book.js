const express = require('express');
const router = express.Router();
const Book = require("../models/book")
const User = require("../models/user")
const fetchUser = require("../middleware/fetchUser")

/********************************* Find all books ***************************/

router.get("/findAllBooks",async(req,res)=>{
    try {
       const userId = req.body._id;
       const books = await Book.find().lean();
       const requestedBooks = books.map(book => ({
        ...book,
        isRequestedByUser: book.requestedBy && book.requestedBy.toString() === userId
    }));
    res.json(requestedBooks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching books', error });
    }
})

/********************************* Get all books of user ***************************/

router.get("/books/user/:userId",async(req,res)=>{
    try {
      const {type} = req.body;
      const userId = req.params.userId;
      let books;
      if(type=="all"){
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

router.post("/addBook",async(req,res)=>{
    try {
        const { owner, title, author, genre, description, condition, coverImageUrl } = req.body;

        if (!owner || !title || !author || !condition) {
          return res.status(400).json({ message: 'Owner, title, author, and condition are required fields.' });
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
        res.status(201).json({ message: 'Book added successfully!', book: savedBook });
      } catch (error) {
        res.status(500).json({ message: 'Error adding book', error });
      }
})


/********************************* List the book for sale ***************************/

router.post("/listBook",async(req,res)=>{
    try {
        const { bookId } = req.body;
        const book = await Book.findById(bookId);
        if (!book) {
          return res.status(404).json({ message: 'Book not found' });
        }
        book.status = 'available';
        await book.save();
        res.status(200).json({ message: 'Book status updated to available', book });
      } catch (error) {
        res.status(500).json({ message: 'Error listing book', error });
      }
})

/********************************* Delete the book ***************************/

router.delete("/deleteBook/:params",async(req,res)=>{
    try {
        const { id } = req.params;
        const deletedBook = await Book.findByIdAndDelete(id);
        if (!deletedBook) {
          return res.status(404).json({ message: 'Book not found.' });
        }
        res.json({ message: 'Book deleted successfully!', book: deletedBook });
      } catch (error) {
        res.status(500).json({ message: 'Error deleting book', error });
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
    book.requestedBy = ownerId;
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

        const currentOwner = await User.findById(owner);
        if (!currentOwner) {
          return res.status(404).json({ message: 'Current owner not found' });
        }
    
        const request = currentOwner.requestHistory.find(
          entry => entry.bookId.equals(bookId) && entry.requestedBy.equals(newOwner) && entry.completed === false
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
        await book.save();
    
        res.status(200).json({ message: 'Request granted and book ownership transferred successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Error processing request', error });
      }
    });

module.exports = router;