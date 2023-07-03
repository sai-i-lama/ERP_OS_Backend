# ERP_OS_BACKEND - INSTALLATION GUIDE

This setup guide is for setting up the application in a local development setup. You can host this application on almost any cloud hosting like AWS, GCP, AZURE, DigitalOcean, Heroku, Netlify, Vercel, Render, etc.

The setup process varies with different OS and hosting providers but the basic steps are the same. So the local environment setup will help to set up the application on other hosting and any OS also.

This application comprises 3 parts: frontend React.js app, backend Express.js app, and PostgreSQL database. You have to set up 3 parts explicitly. Here is the setup guide for each part.

**IMPORTANT NOTE: Follow the steps sequentially otherwise the application may not work properly.**

## Pre-requisites:

1. Download and Install the LTS version (Current LTS version is 16.18.0) of the Node.js runtime environment from the official website [here](https://nodejs.org/en/download/).

If you face any difficulties here is an excellent tutorial on installing Node.js: https://www.geeksforgeeks.org/installation-of-node-js-on-windows/

2. Download and Install the PostgreSQL database from the official website [here](https://www.postgresql.org/download/).

If face any difficulties here is a very good tutorial to install PostgreSQL: https://www.geeksforgeeks.org/install-postgresql-on-windows/

3. Type command: `npm install --global yarn`

It will install yarn package manager globally on your machine if not been installed before.

Without installing Node.js you can’t use the npm command. So be sure that Node.js has been installed properly. To check whether Node.js has been installed correctly or not type the command `node --version` in your terminal. It will show the current Node.js version of your machine.

## STEP 1

### Database - PostgreSQL

1. At the time of installation keep a note about the database username, password, and port number.
2. After installing PostgreSQL you have to create a database. To create a database open psql command shell from and type: `CREATE DATABASE erp;`

Here is a good tutorial to create a database: https://www.tutorialspoint.com/postgresql/postgresql_create_database.htm

3. Keep remembering your database username, password, port, and created database name. It’ll be needed later in the backend part to set up the environmental variable in .env file.

## STEP 2

### Backend - Express/Node.js

1. Navigate into the backend folder ‘ERP_OS_Backend’ from your command prompt/terminal.
2. Type command: `yarn`

It will install all the required libraries and packages required for the backend. Keep patience, it’ll take some time. If you see any warning running yarn then you have to activate the script to run the yarn command in your machine. Or you can use the npm install command instead of yarn.

Without installing Node.js you can’t use the yarn command. So be sure that Node.js has been installed correctly before you use your terminal.

3. You will find a `.env` file in the root directory of the backend ‘ERP_OS_Backend’ and set appropriate values for all the variables. To do this you have to edit the `.env` file and change all the variables accordingly. The `.env` file will look like this below:
4. JWT_SECRET = #type your secret word here#
`
Example: JWT_SECRET = my-secret

DATABASE_URL= # type your database information here. see below example#

Example: DATABASE_URL=postgresql://postgres:admin@localhost:5432/erp

#DATABASE_URL=postgresql://username:password@localhost:port/database_name#
HOST = #For Image Host#

Example: HOST = http://localhost
NODE_ENV = #runnig environment#
Example: NODE_ENV = development
`
4. Type command: `yarn prisma migrate dev`

It will create the required database table and data in the PostgreSQL database that you have installed previously. Your admin and login data will be generated in this step.

(If the seed command doesn’t run automatically then please run the below command. Otherwise, admin data will not populate in the database and thus you can’t log in using admin credentials)

Command: `yarn prisma db seed`

5. Type command: `yarn start`

It will start the backend server on http://localhost:5000/

## STEP 3

### Frontend - React.js

1. Navigate to the frontend folder ‘ERP_OS_Frontend’ from your command prompt/Terminal.
2. Type command: `yarn`

It will install all the required libraries and packages required for the front end. Keep patience, it’ll take some time.

After installing all the packages you may see some warnings. You just ignore that and proceed to the next step. These issues are well-known issue and not aproblem because it is related to some package that was used during development time. These issues have nothing to do with our main application.

3. You will find a `.env` file in the root directory of the front and set the variable `REACT_APP_API = http://localhost:5000/v1/`
4. Type in your terminal command: `yarn start`
It will start the frontend server on http://localhost:3000/

Now go to your browser and type http://localhost:3000/ in your search/address bar and hit enter. You will see the application there.

And yah! You have done installing the ERP OS on your computer/machine. Now have a cup of coffee and enjoy the creation of the OS team.

**IMPORTANT NOTE:**

- To run the application properly on your machine the minimum requirement is:
  - 64bit operating system
  - minimum 4 GB of RAM
  - Minimum 1 GB of free space on HDD/SDD
  - Core i3 or above or equivalence
- You have to run both frontend and backend applications together in a terminal or two different terminals.
- Postgres database will be running in the background. Don’t stop that.
- There are some issues installing this software on Cpanel. Not all Cpanel hosting provider supports the installation of Prisma. Search whether your Cpanel hosting providers support Prisma installation or not before installing this software in Cpanel.
  - Check [here](https://www.prisma.io/docs/guides/deployment/deploying-to-cpanel) 
- This software runs smoothly in any Windows and Linux-based OS which meets the minimum requirements stated above.
