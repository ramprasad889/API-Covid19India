const express = require("express");

const app = express();

app.use(express.json());

const { open } = require("sqlite");

const sqlite3 = require("sqlite3");

const path = require("path");

const dbPath = path.join(__dirname, "covid19India.db");

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
//API 1 Getting List of States As Response
app.get("/states/", async (request, response) => {
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

app.get("/states/:stateId", async (request, response) => {
  const { stateId } = request.params;
  const Query = `
        SELECT * FROM state WHERE state_id=${stateId};`;

  const dbResponse = await db.get(Query);
  response.send(dbResponse);
});

//API 3 Add districts in district Tables

app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  console.log(districtDetails)
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
