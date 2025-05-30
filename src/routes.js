const router = require("express").Router();
const { url } = require("inspector");
const path = require("path");

// Requiring Ltijs
const lti = require("ltijs").Provider;

// Grading route
router.post("/grade", async (req, res) => {
  try {
    const idtoken = res.locals.token; // IdToken
    const score = req.body.grade; // User numeric score sent in the body
    // Creating Grade object
    const gradeObj = {
      userId: idtoken.user,
      scoreGiven: score,
      scoreMaximum: 100,
      activityProgress: "Completed",
      gradingProgress: "FullyGraded",
    };

    console.log(JSON.stringify(idtoken, null, 2));

    const response = await lti.Grade.getLineItems(idtoken, {
      resourceLinkId: true,
    });
    console.log(JSON.stringify(response, null, 2));

    const scoreResponse = await lti.Grade.getScores(
      idtoken,
      idtoken.platformContext.endpoint.lineitem,
      { userId: idtoken.user }
    );
    console.log(JSON.stringify(scoreResponse, null, 2));

    // Selecting linetItem ID
    let lineItemId = idtoken.platformContext.endpoint.lineitem; // Attempting to retrieve it from idtoken
    if (!lineItemId) {
      const response = await lti.Grade.getLineItems(idtoken, {
        resourceLinkId: true,
      });

      console.log(JSON.stringify(response));

      const lineItems = response.lineItems;
      if (lineItems.length === 0) {
        // Creating line item if there is none
        console.log("Creating new line item");
        const newLineItem = {
          scoreMaximum: 100,
          label: "Grade",
          tag: "grade",
          resourceLinkId: idtoken.platformContext.resource.id,
        };
        const lineItem = await lti.Grade.createLineItem(idtoken, newLineItem);
        lineItemId = lineItem.id;
      } else lineItemId = lineItems[0].id;
    }

    // Sending Grade
    const responseGrade = await lti.Grade.submitScore(
      idtoken,
      lineItemId,
      gradeObj
    );
    return res.send(responseGrade);
  } catch (err) {
    console.log(err.message);
    return res.status(500).send({ err: err.message });
  }
});

// Names and Roles route
router.get("/members", async (req, res) => {
  const idtoken = res.locals.token; // IdToken
  console.log(JSON.stringify(idtoken));

  try {
    const result = await lti.NamesAndRoles.getMembers(res.locals.token);
    if (result) return res.send(result.members);
    return res.sendStatus(500);
  } catch (err) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
});

// Deep linking route
router.post("/deeplink", async (req, res) => {
  try {
    const resource = req.body;

    // const items = [
    //   {
    //     type: "ltiResourceLink",
    //     title: "This is your skillpies link",
    //     text: "Description of the link",
    //     url: "https://dev.skillpies.com/api/lti/redirect?resource=resource1",
    //     // custom: {
    //     //   // name: "Boo",
    //     //   // value: "hoo",
    //     // },
    //   },
    // ];

    // const items = {
    //   type: "ltiResourceLink",
    //   title: "Ltijs Demo",
    //   custom: {
    //     name: resource.name || "Name",
    //     value: resource.value || "Value",
    //   },
    // };

    const items = [
      {
        type: "ltiResourceLink",
        title: "Ltijs Demo 1.1.4",
        url: "https://dev.skillpies.com/api/lti",
        // resource_link_id: "resource1",

        custom: {
          name: "name",
          value: "value",
        },
      },
    ];

    // const items = {
    //   type: "link",
    //   title: "SkillPies",
    //   url: "https://www.skillpies.com",
    // };

    const form = await lti.DeepLinking.createDeepLinkingForm(
      res.locals.token,
      items,
      { message: "Successfully Registered" }
    );
    if (form) return res.send(form);
    return res.sendStatus(500);
  } catch (err) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
});

router.post("/deeplinkmessage", async (req, res) => {
  try {
    const token = res.locals.token;
    const deepLinkedCourses = [
      { courseName: "My Course", courseId: "c12" },
    ].map((course) => {
      // return {
      //   type: "ltiResourceLink",
      //   title: course.courseName,

      //   url: "https://dev.skillpies.com/api/lti",
      //   "https://purl.imsglobal.org/spec/lti/claim/target_link_uri":
      //     "https://dev.skillpies.com/api/lti",
      //   "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
      //     id: "my-course-001", // Required by Blackboard
      //   },
      //   custom: {
      //     name: course.courseName,
      //     value: course.courseId,
      //   },
      // };
      return {
        type: "ltiResourceLink",
        title: "It worked now",
        text: 'A & description with quotes and custom parameters"',
        // url: "https://dev.skillpies.com/api/lti",
        available: {
          startDateTime: "2024-09-25T13:00:00.000Z",
          endDateTime: "2024-10-25T13:00:00.000Z",
        },
        submission: {
          endDateTime: "2024-10-25T13:00:00.000Z",
        },
        custom: {
          name: course.courseName,
          value: course.courseId,
          other: "123",
          andAnother: 345345,
        },
        lineItem: {
          scoreMaximum: 100,
          label: "Chapter 12 quiz",
          resourceId: "xyzpdq1234",
          tag: "originality",
        },
      };
    });
    const deepLinkingMessage = await lti.DeepLinking.createDeepLinkingMessage(
      token,
      deepLinkedCourses,
      { message: "Successfully Registered", expiresIn: 300 }
    );
    const responseJson = {
      message: deepLinkingMessage,
      url: token.platformContext.deepLinkingSettings.deep_link_return_url,
    };
    if (deepLinkingMessage) res.send(responseJson);
  } catch (err) {
    console.log(err.message);
    return res.status(500).send(err.message);
  }
});

// Return available deep linking resources
router.get("/resources", async (req, res) => {
  const resources = [
    {
      name: "Resource1",
      value: "value1",
    },
    {
      name: "Resource2",
      value: "value2",
    },
    {
      name: "Resource3",
      value: "value3",
    },
  ];
  return res.send(resources);
});

// Get user and context information
router.get("/info", async (req, res) => {
  const token = res.locals.token;
  const context = res.locals.context;

  const info = {};
  if (token.userInfo) {
    if (token.userInfo.name) info.name = token.userInfo.name;
    if (token.userInfo.email) info.email = token.userInfo.email;
  }

  if (context.roles) info.roles = context.roles;
  if (context.context) info.context = context.context;

  const result = await lti.Grade.getLineItems(res.locals.token, {
    resourceLinkId: true,
  });
  info.lineItems = result;

  return res.send(info);
});

// Get user and context information
router.get("/api/lti/redirect", async (req, res) => {
  // Extract query parameters from the original request
  const query = req.query;

  // Construct the new URL with query parameters
  const queryString = new URLSearchParams(query).toString();
  const newUrl = `/api/lti${queryString ? `?${queryString}` : ""}`;

  // Redirect to the new URL
  res.redirect(newUrl);

  //res.redirect("/api/lti");
});

// Get user and context information
router.post("/api/lti/redirect", async (req, res) => {
  // redirect to "/"
  res.redirect("/api/lti", 302);
});

// Wildcard route to deal with redirecting to React routes
router.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "../public/index.html"))
);

module.exports = router;
