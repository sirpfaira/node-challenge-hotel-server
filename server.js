const express = require('express');
const cors = require('cors');
const allBookings = require('./bookings.json');

const app = express();

app.use(express.json());
app.use(cors());

//Use this array as your (in-memory) data store.
const bookings = require('./bookings.json');

app.get('/', function (request, response) {
  response.send('Hotel booking server.  Ask for /bookings, etc.');
});

// TODO add your routes and helper functions here
app.get('/bookings', function (req, res) {
  res.json(allBookings);
});

app.get('/bookings/search', function (request, response) {
  const { term } = request.query;
  if (term) {
    response
      .status(200)
      .json(
        allBookings.filter(
          (booking) =>
            booking.firstName.toUpperCase().includes(term.toUpperCase()) ||
            booking.surname.toUpperCase().includes(term.toUpperCase()) ||
            booking.email.toUpperCase().includes(term.toUpperCase())
        )
      );
  }
});

app.get('/bookings/:bookingId', function (req, res) {
  const { bookingId } = req.params;
  const responseObject = allBookings.find((booking) => booking.id == bookingId);
  responseObject
    ? res.json(responseObject)
    : res.status(400).send(`Booking with ID: ${bookingId} was not found`);
});

//GET    | /bookings/search?date=2019-05-20 | return all bookings spanning the given date
// should return bookings where indate<=date && outdate >=date

app.post('/bookings', function (req, res) {
  const newBooking = req.body;
  if (
    newBooking.title &&
    newBooking.firstName &&
    newBooking.surname &&
    newBooking.email &&
    newBooking.roomId &&
    newBooking.checkInDate &&
    newBooking.checkOutDate
  ) {
    newBooking.id = allBookings.length + 1;
    allBookings.push(newBooking);
    res.send('Booked successfully!');
  } else {
    res.status(400).send('All fields are required!');
  }
});

app.delete('/bookings/:bookingId', function (req, res) {
  const { bookingId } = req.params;
  const responseObject = allBookings.find((booking) => booking.id == bookingId);

  if (responseObject) {
    allBookings.splice(allBookings.indexOf(responseObject), 1);
    res.send(`Booking #${bookingId} deleted!`);
  } else {
    res.status(404).send(`Booking with ID: ${bookingId} was not found`);
  }
});
const PORT = process.env.PORT || 3000;

const listener = app.listen(PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
