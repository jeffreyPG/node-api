const _ = require("lodash");
const mongoose = require("mongoose");
const Organization = mongoose.model("Organization");
const User = mongoose.model("User");
const Code = mongoose.model("Code");
const validate = require("../utils/api.validation");
const emailClient = require("../utils/api.smtp.client");
const utils = require("util");
const ObjectId = mongoose.Types.ObjectId;

const sendOrganizationInvite = async (userId, orgId, email, prefix, role) => {
  try {
    const requestingUser = await User.findById(ObjectId(userId.toString()));
    const org = await Organization.findById(ObjectId(orgId)).lean();
    const uri =
      process.env.HOST +
      "/" +
      prefix +
      "organization/" +
      org._id +
      "/confirmUser/";
    // validate email address
    if (!validate.valEmailAddress(email)) {
      return;
    }
    const user = await User.find({
      email: email
    })
      .limit(1)
      .lean(true)
      .exec();
    if (
      user &&
      user[0] &&
      user[0].orgIds.length > 0 &&
      user[0].orgIds.indexOf(orgId) >= 0
    )
      return;

    const code = new Code({
      userEmail: email,
      role: role || "editor"
    });
    await code.save();
    let message;
    const options = {
      to: [email],
      subject:
        requestingUser.name + " wants to add you to a buildee organization"
    };

    const buildeeLogo =
      "https://s3-us-west-2.amazonaws.com/buildee-test/buildee-logo.png";
    if (user.length === 0) return;

    message = {
      text: "Your organization confirmation link : " + uri + code.code,
      html:
        '<div style="background-color:#F9FAFB;padding:30px">' +
        '<div style="padding:10px;max-width:300px;margin:auto;"><img style="display:block;max-width:100%;margin:auto;" src="' +
        buildeeLogo +
        '" /></div>' +
        "<div style=\"background-color:#fff;padding:30px;max-width:400px;margin:auto;border: 1px solid #f3f3f3;border-radius: 4px;\"><h2 style=”font-family:'Muli', Helvetica, sans-serif; font-size:24px;”>Please join my buildee organization: " +
        org.name +
        "</h2>" +
        "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”>Please click the following link to join:</p>" +
        "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”><a href=\"" +
        uri +
        code.code +
        "?userId=" +
        user[0]._id +
        '">Join Organization</a></p>' +
        "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”>This link will expire in <span style=\"color:red\">48 hours</span>!</p>" +
        "<p style=”font-family:'Open Sans', Helvetica, sans-serif;”>- the buildee team</p></div></div>"
    };
    const asyncFunc = utils.promisify(sendEmailFunc);
    await asyncFunc(options, message, email, code);
    console.log("sent");
  } catch (error) {
    console.log("error", error);
  }
};

const sendUserInviteEmail = async (changePasswordUrl, email) => {
  try {
    if (!validate.valEmailAddress(email)) {
      return;
    }
    let message;
    const options = {
      to: [email],
      subject: "Welcome to buildee"
    };

    const buildeeLogo =
      "https://s3-us-west-2.amazonaws.com/buildee-test/buildee-logo.png";

    message = {
      text: "Confirm your account: " + changePasswordUrl,
      html: `<div>
          <p style="font-family:ProximaNova,sans-serif;text-align:center;margin-bottom:0px">
            <img src="${buildeeLogo}" width="100" alt="Buildee" style="line-height:13px;border:0px;height:auto;outline:none" class="CToWUd">
          </p>
          <h1 style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">Your Account</h1>
          <span class="im">
            <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">
                <span style="font-family:Roboto,RobotoDraft,Helvetica,Arial,sans-serif;text-align:start">Hello! We are excited to get you started on buildee.&nbsp;</span>
            </p>
          </span>
          <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">
            <span style="font-family:Roboto,RobotoDraft,Helvetica,Arial,sans-serif;text-align:start">
            <b>Step 1</b>
            </span>
          </p>
          <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">
            <span style="font-family:Roboto,RobotoDraft,Helvetica,Arial,sans-serif;text-align:start">To confirm your account</span>&nbsp; <a href="${changePasswordUrl}" target="_blank" data-saferedirecturl="${changePasswordUrl}">click here</a>.
          </p>
          <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">
            <b>Step 2</b>
          </p>
          <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">Sign in at <a href="${process.env.HOST}" target="_blank" data-saferedirecturl="${process.env.HOST}">app.buildee.com</a>
          </p>
          <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">
            <b>Step 3</b>
          </p>
          <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">Download the Field App from the <a href="https://t.sidekickopen07.com/s3t/c/5/f18dQhb0S7kF8cpjvvW5bQGGY2zGCwVW8Jbw_88pTn5gW1SJmm07dKXK6W56dPcK2TjL32102?te=W3R5hFj4cm2zwW3R4SH83zbVgDW3P0vWK41RkwNW3Fdxsm1LFV3XW45W2z03SYG0rW4cgyY91Ld4rfW2f5N_P21g_Y4W1WZjqM1Ntw6xW3F52dJ3yN31cW1Gbkgw22WkXbW20XTlt1-Sw4SW3GP5PG20YCyPW22PB6Z3SZ4JjW3R4SSr3GP4H0W4cKJrV3M0gX5W3JBbbs3_Qh0kW4mHFgM3JMK17W3bhP8n2xVlz8W2PfxCR3_Qh5fW4hLxLG2f8QbLW3K6K773Zp0KMW3_QgzD3H6xvkW2f7yfr3T0nvmW3R4SSx3DQGFFW2nT8K04t3tQ4W2D1GBn4kKVNLW3bs9H_2TJDL2W2sMkY43BKrSVW4kKsZ72vJ9s9W2FDVJD2YsMRWW2xYf_149JdKVW2t0Wnw2WrhY2W43V2j-2PxVCWf2xN6Td04&amp;si=7000000000158309&amp;pi=9a20ef43-b1b8-4c06-d5e2-2c7a8fdb1bb4" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://t.sidekickopen07.com/s3t/c/5/f18dQhb0S7kF8cpjvvW5bQGGY2zGCwVW8Jbw_88pTn5gW1SJmm07dKXK6W56dPcK2TjL32102?te%3DW3R5hFj4cm2zwW3R4SH83zbVgDW3P0vWK41RkwNW3Fdxsm1LFV3XW45W2z03SYG0rW4cgyY91Ld4rfW2f5N_P21g_Y4W1WZjqM1Ntw6xW3F52dJ3yN31cW1Gbkgw22WkXbW20XTlt1-Sw4SW3GP5PG20YCyPW22PB6Z3SZ4JjW3R4SSr3GP4H0W4cKJrV3M0gX5W3JBbbs3_Qh0kW4mHFgM3JMK17W3bhP8n2xVlz8W2PfxCR3_Qh5fW4hLxLG2f8QbLW3K6K773Zp0KMW3_QgzD3H6xvkW2f7yfr3T0nvmW3R4SSx3DQGFFW2nT8K04t3tQ4W2D1GBn4kKVNLW3bs9H_2TJDL2W2sMkY43BKrSVW4kKsZ72vJ9s9W2FDVJD2YsMRWW2xYf_149JdKVW2t0Wnw2WrhY2W43V2j-2PxVCWf2xN6Td04%26si%3D7000000000158309%26pi%3D9a20ef43-b1b8-4c06-d5e2-2c7a8fdb1bb4&amp;source=gmail&amp;ust=1651158992164000&amp;usg=AOvVaw3WtDZD6vx7OPhnVYR_ZOB0">Apple App Store</a> or <a href="https://t.sidekickopen07.com/s3t/c/5/f18dQhb0S7kF8cpjvvW5bQGGY2zGCwVW8Jbw_88pTn5gW1SJmm07dKXK6W56dPcK2TjL32102?te=W3R5hFj4cm2zwW3R4SH83zbVgDW3P0vWK41RkwNW3Fdxsm1LFV3XW45W2z03SYG0rW4cgyY91Ld4rfW2dMj3n3C88tyW3LCyny3LDP5qW1Sr1cB3C6X7nW1G9WDs1Q5RMcW22V3V83yH_LQW3GP5PG20YCyPW22PB6Z3SZ4JjW3R4SSr3GP4H0W4cKJrV3M0gX5W3JBbbs3_Qh0kW4mHFgM3JMK17W3bhP8n2xVlz8W2PfxCR3_Qh5fW4hLxLG2f8QbLW3K6K773Zp0KMW3_QgzD3H6xvkW2f7yfr3T0nvmW3R4SSx3DQGFFW2nT8K04t3tQ4W2D1GBn4kKVNLW3bs9H_2TJDL2W2sMkY43BKrSVW4kKsZ72vJ9s9W2FDVJD2YsMRWW2xYf_149JdKVW2t0Wnw2WrhY2W43V2j-2PxVCWf2xN6Td04&amp;si=7000000000158309&amp;pi=9a20ef43-b1b8-4c06-d5e2-2c7a8fdb1bb4" target="_blank" data-saferedirecturl="https://www.google.com/url?q=https://t.sidekickopen07.com/s3t/c/5/f18dQhb0S7kF8cpjvvW5bQGGY2zGCwVW8Jbw_88pTn5gW1SJmm07dKXK6W56dPcK2TjL32102?te%3DW3R5hFj4cm2zwW3R4SH83zbVgDW3P0vWK41RkwNW3Fdxsm1LFV3XW45W2z03SYG0rW4cgyY91Ld4rfW2dMj3n3C88tyW3LCyny3LDP5qW1Sr1cB3C6X7nW1G9WDs1Q5RMcW22V3V83yH_LQW3GP5PG20YCyPW22PB6Z3SZ4JjW3R4SSr3GP4H0W4cKJrV3M0gX5W3JBbbs3_Qh0kW4mHFgM3JMK17W3bhP8n2xVlz8W2PfxCR3_Qh5fW4hLxLG2f8QbLW3K6K773Zp0KMW3_QgzD3H6xvkW2f7yfr3T0nvmW3R4SSx3DQGFFW2nT8K04t3tQ4W2D1GBn4kKVNLW3bs9H_2TJDL2W2sMkY43BKrSVW4kKsZ72vJ9s9W2FDVJD2YsMRWW2xYf_149JdKVW2t0Wnw2WrhY2W43V2j-2PxVCWf2xN6Td04%26si%3D7000000000158309%26pi%3D9a20ef43-b1b8-4c06-d5e2-2c7a8fdb1bb4&amp;source=gmail&amp;ust=1651158992164000&amp;usg=AOvVaw1I_cqqklSGAkn0J_mZoj2A">Google Play Store</a>
          </p>
          <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">
            <br>
          </p>
          <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">Thanks and welcome aboard!</p>
          <p style="font-family:ProximaNova,sans-serif;text-align:-webkit-center">
            <strong>The buildee Team</strong>
          </p>
      </div>`
    };
    emailClient.sendEmail(options, message, function(err) {
      if (err) return;

      // Email success message
      console.log("User Invite emailed");
      return;
    });
  } catch (error) {
    console.log("error", error);
  }
};

const sendEmailFunc = (options, message, email, code, done) => {
  emailClient.sendEmail(options, message, function(err) {
    if (err) return;

    let resMessage = "Confirmation email sent to: " + email;

    if (
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "test"
    ) {
      resMessage = "Confirmation email sent : " + code.code;
    }
    console.log(
      "Email sent to user for organization access",
      resMessage,
      email
    );
    done();
  });
};

module.exports = {
  sendOrganizationInvite,
  sendUserInviteEmail
};
