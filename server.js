const express = require('express');
const cors = require('cors');
const allBookings = require('./bookings.json');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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

app.get('/customers', async (req, res) => {
  const result = await pool.query('SELECT * FROM customers ORDER BY name');
  res.json(result.rows);
});

app.get('/customers/:customerId', function (req, res) {
  const { customerId } = req.params;

  pool
    .query('SELECT * FROM customers WHERE id=$1', [customerId])
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

app.get('/customers/:customerId/bookings', function (req, res) {
  const { customerId } = req.params;

  pool
    .query(
      'SELECT c.name, h.name, b.checkin_date, b.nights FROM bookings b INNER JOIN customers c ON b.customer_id = c.id INNER JOIN hotels h ON b.hotel_id = h.id WHERE c.id = $1;',
      [customerId]
    )
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

app.put('/customers/:customerId', function (req, res) {
  const customerId = req.params.customerId;
  const newEmail = req.body.email;

  if (newEmail) {
    pool
      .query('UPDATE customers SET email=$1 WHERE id=$2', [
        newEmail,
        customerId,
      ])
      .then(() => res.send(`Customer ${customerId} updated!`))
      .catch((e) => console.error(e));
  } else {
    res.status(400).send(`No email provided!`);
  }
});

app.delete('/customers/:customerId', function (req, res) {
  const customerId = req.params.customerId;

  pool
    .query('DELETE FROM bookings WHERE customer_id=$1', [customerId])
    .then(() => {
      pool
        .query('DELETE FROM customers WHERE id=$1', [customerId])
        .then(() => res.send(`Customer ${customerId} deleted!`))
        .catch((e) => console.error(e));
    })
    .catch((e) => console.error(e));
});

app.get('/hotels', function (req, res) {
  const hotelNameQuery = req.query.name;
  let query = `SELECT * FROM hotels ORDER BY name`;

  if (hotelNameQuery) {
    query = `SELECT * FROM hotels WHERE name ILIKE '%${hotelNameQuery}%' ORDER BY name`;
  }

  pool
    .query(query)
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

app.get('/hotels/:hotelId', function (req, res) {
  const { hotelId } = req.params;

  pool
    .query('SELECT * FROM hotels WHERE id=$1', [hotelId])
    .then((result) => res.json(result.rows))
    .catch((e) => console.error(e));
});

app.post('/hotels', function (req, res) {
  const newHotelName = req.body.name;
  const newHotelRooms = req.body.rooms;
  const newHotelPostcode = req.body.postcode;

  if (!Number.isInteger(newHotelRooms) || newHotelRooms <= 0) {
    return res
      .status(400)
      .send('The number of rooms should be a positive integer.');
  }

  pool
    .query('SELECT * FROM hotels WHERE name=$1', [newHotelName])
    .then((result) => {
      if (result.rows.length > 0) {
        return res
          .status(400)
          .send('An hotel with the same name already exists!');
      } else {
        const query =
          'INSERT INTO hotels (name, rooms, postcode) VALUES ($1, $2, $3)';
        pool
          .query(query, [newHotelName, newHotelRooms, newHotelPostcode])
          .then(() => res.send('Hotel created!'))
          .catch((e) => console.error(e));
      }
    });
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
const PORT = process.env.PORT || 5000;

const listener = app.listen(PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
