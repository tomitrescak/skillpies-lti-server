require("dotenv").config();
const path = require("path");
const routes = require("./src/routes");

const lti = require("ltijs").Provider;

// Setup
lti.setup(
  process.env.LTI_KEY,
  {
    url: "mongodb://localhost:27017/ltijs?retryWrites=true&loadBalanced=false&serverSelectionTimeoutMS=5000&connectTimeoutMS=10000",
    // "mongodb://" +
    // process.env.DB_HOST +
    // "/" +
    // process.env.DB_NAME
    //   +
    //   "?authSource=admin",
    // connection: { user: process.env.DB_USER, pass: process.env.DB_PASS },
  },
  {
    appUrl: "/api/lti",
    loginUrl: "/api/lti/login",
    keysetUrl: "/api/lti/jwks",
    logger: true,
    staticPath: path.join(__dirname, "./public"), // Path to static files
    ltiaas: true,
    cookies: {
      secure: true, // Set secure to true if the testing platform is in a different domain and https is being used
      sameSite: "None", // Set sameSite to 'None' if the testing platform is in a different domain and https is being used
    },
    // devMode: false, // Set DevMode to true if the testing platform is in a different domain and https is not being used
  }
);

function createLtikURL(base, req, res) {
  // Extract query parameters from the original request
  const query = req.query;

  // Construct the new URL with query parameters
  let queryString = new URLSearchParams(query).toString();
  if (res.locals.ltik) {
    queryString += `&ltik=${res.locals.ltik}`;
  }
  const newUrl = `${base}${queryString ? `?${queryString}` : ""}`;
  return newUrl;
}

// When receiving successful LTI launch redirects to app
lti.onConnect(async (token, req, res) => {
  console.log("Connected");

  const newUrl = createLtikURL("http://localhost:3050/lti/home", req, res);

  // Redirect to the new URL
  res.redirect(newUrl);

  // return res.sendFile(path.join(__dirname, "./public/index.html"));
});

// When receiving deep linking request redirects to deep screen
lti.onDeepLinking(async (token, req, res) => {
  // return lti.redirect(res, "/deeplink", { newResource: true });

  console.log("Deep");

  const newUrl = createLtikURL("http://localhost:3050/lti/deep", req, res);

  // Redirect to the new URL
  res.redirect(newUrl);
});

// Setting up routes
lti.app.use(routes);

// Setup function
const setup = async () => {
  await lti.deploy({ port: process.env.PORT });

  /**
   * Register platform
   */
  await lti.registerPlatform({
    url: "https://blackboard.com",
    name: "SkillPies 1.3",
    clientId: "e1a9f302-6c64-4ecd-904b-5eddae93c10f",
    authenticationEndpoint:
      "https://developer.blackboard.com/api/v1/gateway/oidcauth",
    accesstokenEndpoint:
      "https://developer.blackboard.com/api/v1/gateway/oauth2/jwttoken",
    authConfig: {
      method: "JWK_SET",
      key: "https://developer.blackboard.com/api/v1/management/applications/e1a9f302-6c64-4ecd-904b-5eddae93c10f/jwks.json",
    },
  });
};

setup();
