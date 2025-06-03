const router = require("express").Router();
const { url } = require("inspector");
const path = require("path");

// Requiring Ltijs
const lti = require("ltijs").Provider;

/**
 * @typedef {Object} SectionResource
 * @property {string} sectionId
 * @property {string} courseId
 * @property {string} courseName
 * @property {string} sectionName
 * @property {string} sectionDescription
 * @property {string} sectionType
 */

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
// router.post("/deeplink", async (req, res) => {
//   try {
//     const resource = req.body;

//     const items = [
//       {
//         type: "ltiResourceLink",
//         title: "Ltijs Demo 1.1.4",
//         url: "https://dev.skillpies.com/api/lti",
//         // resource_link_id: "resource1",

//         custom: {
//           name: "name",
//           value: "value",
//         },
//       },
//     ];

//     const form = await lti.DeepLinking.createDeepLinkingForm(
//       res.locals.token,
//       items,
//       { message: "Successfully Registered" }
//     );
//     if (form) return res.send(form);
//     return res.sendStatus(500);
//   } catch (err) {
//     console.log(err.message);
//     return res.status(500).send(err.message);
//   }
// });

router.post("/deeplinkmessage", async (req, res) => {
  try {
    /** @type {SectionResource} */
    const resource = req.body;

    const token = res.locals.token;
    const deepLinkedCourses = [resource].map((value) => {
      return {
        type: "ltiResourceLink",
        title: value.sectionName,
        text: value.sectionDescription,
        custom: {
          type: value.sectionType,
          course: value.courseId,
          section: value.sectionId,
        },
        // url: "https://dev.skillpies.com/api/lti",
        // available: {
        //   startDateTime: "2024-09-25T13:00:00.000Z",
        //   endDateTime: "2024-10-25T13:00:00.000Z",
        // },
        // submission: {
        //   endDateTime: "2024-10-25T13:00:00.000Z",
        // },
        // lineItem: {
        //   scoreMaximum: 100,
        //   label: "Chapter 12 quiz",
        //   resourceId: "xyzpdq1234",
        //   tag: "originality",
        // },
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

module.exports = router;
