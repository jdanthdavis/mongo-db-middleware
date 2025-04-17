# MongoDB Middleware API

This is a simple Express.js middleware that provides two main API endpoints for interacting with a MongoDB database. The middleware is designed to interact with a MongoDB collection named `pets`, allowing you to query and update pet scores for players.

## Features

- **GET `/get-pets`**: Retrieves the score of a specific player by querying the MongoDB database.
- **POST `/increment-pets`**: Increments the pet count for a specific player in the MongoDB database.

## API Endpoints

### **GET `/get-pets?playername=<playername>`**

- **Description**: Retrieves the score for a specific player.
- **Parameters**:
  - `playername` (query parameter): The name of the player whose score you want to retrieve.
- **Response**:
  - `200 OK`: Returns the player's score.
  - `400 Bad Request`: If no playername is provided.
  - `404 Not Found`: If the player does not exist.
  - `500 Internal Server Error`: If there is an error in the MongoDB query.

### **POST `/increment-pets`**

- **Description**: Increments the pet count for a specific player.
- **Body**:
  - `playername` (JSON body): The name of the player whose pet count you want to increment.
- **Response**:
  - `200 OK`: If the pet count was successfully incremented.
  - `400 Bad Request`: If the `playername` is missing.
  - `404 Not Found`: If the player is not found in the database.
  - `500 Internal Server Error`: If there is an error while updating the database.

## Example

### GET Request

```bash
curl -X GET "http://localhost:3000/get-pets?playername=player1"
```
### Response
```json
{
  "score": 10
}
```

### POST Request

```bash
curl -X POST "http://localhost:3000/increment-pets" \
-H "Content-Type: application/json" \
-d '{"playername": "player1"}'
```
### Response
```json
{
  "success": true,
  "playername": "player1"
}
```
