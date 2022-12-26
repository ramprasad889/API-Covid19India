const express = require("express");

const app = express();

app.use(express.json());

const bcrypt=require('bcrypt');

const jwt =require('jsonwebtoken');

const {sign,verify}= jwt;

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const path = require("path");

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Started at http://localhost:3000");
    });
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

initializeDbAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//Login API

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  //console.log(dbUser.password);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    //console.log(isPasswordMatched);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 1 Getting List of States As Response

app.get("/states/", authenticateToken, async (request, response) => {
  const Query = `
        SELECT 
            *
        FROM state`;
  const dbResponse = await db.all(Query);
  response.send(
    dbResponse.map((Obj) => {
      return {
        stateId: Obj.state_id,
        stateName: Obj.state_name,
        population: Obj.population,
      };
    })
  );
});

//API 2 Get State Details

app.get("/states/:stateId",authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const Query = `
        SELECT * FROM state WHERE state_id=${stateId};`;

  const dbObject = await db.get(Query);

  response.send({
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  });
});

//API 3 Error Add districts in district Tables

app.post("/districts/",authenticateToken, async (request, response) => {
  const districtDetails = request.body;
  //console.log(districtDetails);
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  //console.log(districtName, stateId, cases, cured, active, deaths);
  const Query = `INSERT INTO
                    district (district_name,state_id,cases,cured,active,deaths)
                values ('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  const dbResponse = await db.run(Query);
  response.send("District Successfully Added");
});

//API 4 Get district Details

app.get("/districts/:districtId/",authenticateToken, async (request, response) => {
  const { districtId } = request.params;
  const Query = `SELECT * FROM district WHERE district_id=${districtId};`;

  const dbResponse = await db.get(Query);
  //console.log(dbResponse);
  response.send({
    districtId: dbResponse.district_id,
    districtName: dbResponse.district_name,
    stateId: dbResponse.state_id,
    cases: dbResponse.cases,
    cured: dbResponse.cured,
    active: dbResponse.active,
    deaths: dbResponse.deaths,
  });
});

//API 5 Delete district Details

app.delete("/districts/:districtId/",authenticateToken, async (request, response) => {
  const { districtId } = request.params;
  const Query = `
            DELETE FROM
            district
            WHERE district_id=${districtId};`;
  const dbResponse = await db.run(Query);
  response.send("District Removed");
});

//API 6 Updates the details of a specific district based on the district ID

app.put("/districts/:districtId/",authenticateToken, async (request, response) => {
  const { districtId } = request.params;
  //console.log(districtId);
  //console.log(request.body);
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const Query = `UPDATE 
                    district
                    SET 
                        district_name='${districtName}',
                        state_id=${stateId},
                        cases=${cases},
                        cured=${cured},
                        active=${active},
                        deaths=${deaths}
                    WHERE district_id=${districtId};`;
  const dbResponse = await db.run(Query);
  response.send("District Details Updated");
});

//API 7 Returns the statistics of total cases, cured, active, deaths of a specific state based on state ID
app.get("/states/:stateId/stats/",authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const Query = `
                SELECT 
                    sum(cases) AS totalCases,
                    sum(cured) AS totalCured,
                    sum(active) AS totalActive,
                    sum(deaths) AS totalDeaths
                FROM 
                    district 
                WHERE 
                    state_id=${stateId};`;
  const dbResponse = await db.get(Query);
  response.send(dbResponse);
});

//API 8 Returns an object containing the state name of a district based on the district ID
app.get("/districts/:districtId/details/",authenticateToken, async (request, response) => {
  const { districtId } = request.params;
  const Query = `
                SELECT 
                    state_name AS stateName
                FROM 
                    state
                INNER JOIN 
                    district
                WHERE state.state_id=district.state_id;`;
  const dbResponse = await db.get(Query);
  response.send(dbResponse);
});

module.exports = app;
