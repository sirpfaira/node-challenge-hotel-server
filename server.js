const express = require('express');
const cors = require('cors');
const allBookings = require('./bookings.json');

const app = express();
var moment = require('moment');
moment().format('YYYY-MM-DD');

var emailValidator = require('email-validator');

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

app.get('/bookings/search', function (req, res) {
  const { term, date } = req.query;
  if (term) {
    res
      .status(200)
      .json(
        allBookings.filter(
          (booking) =>
            booking.firstName.toUpperCase().includes(term.toUpperCase()) ||
            booking.surname.toUpperCase().includes(term.toUpperCase()) ||
            booking.email.toUpperCase().includes(term.toUpperCase())
        )
      );
  } else if (date) {
    const foundBookings = allBookings.filter(
      (booking) =>
        (moment(date).isSame(booking.checkInDate) ||
          moment(booking.checkInDate).isBefore(date)) &&
        (moment(date).isSame(booking.checkOutDate) ||
          moment(booking.checkOutDate).isAfter(date))
    );

    if (foundBookings.length > 0) {
      res.status(200).json(foundBookings);
    } else {
      res.status(200).send(`No customer booked on "${date}"!`);
    }
  } else {
    res
      .status(404)
      .send(`Your search request should include a variable "term" or "date"`);
  }
});

app.get('/bookings/:bookingId', function (req, res) {
  const { bookingId } = req.params;
  const responseObject = allBookings.find((booking) => booking.id == bookingId);
  responseObject
    ? res.json(responseObject)
    : res.status(400).send(`Booking with ID: "${bookingId}" was not found`);
});

app.post('/bookings', function (req, res) {
  const {
    title,
    firstName,
    surname,
    email,
    roomId,
    checkInDate,
    checkOutDate,
  } = req.body;

  if (
    title &&
    firstName &&
    surname &&
    email &&
    roomId &&
    checkInDate &&
    checkOutDate
  ) {
    if (emailValidator.validate(email)) {
      if (moment(checkInDate).isBefore(moment(checkOutDate))) {
        allBookings.push({
          id: allBookings.length + 1,
          title: title,
          firstName: firstName,
          surname: surname,
          email: email,
          roomId: roomId,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate,
        });
        res.send(`Booked successfully on ${moment().format('YYYY-MM-DD')}`);
      } else {
        res
          .status(400)
          .send(
            `The Check In Date: "${checkInDate}" should be before Check Out Date: "${checkOutDate}"`
          );
      }
    } else {
      res.status(400).send(`The email address "${email}" is invalid!`);
    }
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
    res.status(404).send(`Booking with ID: "${bookingId}" was not found`);
  }
});
const PORT = process.env.PORT || 3000;

const listener = app.listen(PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
