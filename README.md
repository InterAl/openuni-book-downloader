# OliveReader book downloader (http://openbooks.openu.ac.il)

### How to find the book ID

To download a book, you need to manually extract its book id. It's quite simple. Enter the book's page and look at its URL. For instance:

http://olvreader.sefereshet.org.il/Olive/OTB/OpenU/?href=C20117/2008/01/01&ustick...

The book id is the href parameter. In this case: C20117/2008/01/01

### Usage
To download a book, pass the book id and the folder name for the book (no need to create it manually).

Then run:

```bash
$ npm start -- bookid foldername
```
