/*
 * SPDX-License-Identifier: Apache-2.0
 */

"use strict";

const {
  Gateway,
  Wallets,
  DefaultEventHandlerStrategies,
  TxEventHandlerFactory,
} = require("fabric-network");
const fs = require("fs");
const path = require("path");
const helper = require("./helper");
const log4js = require("log4js");
const crypto = require("crypto");
const util = require("util");
const UserVote = require("../src/vote.model");
const PlanData = require("../src/planData.model");

function sha256(data) {
  return crypto.createHash("sha256").update(data, "binary").digest("base64");
}

const fetchUserVote = async (username, org_name, planName) => {
  try {
    const ccp = await helper.getCCP(org_name);
    const walletPath = await helper.getWalletPath(org_name);
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    const identity = await wallet.get(username);

    if (!identity) {
      console.log(
        `An identity for the user ${username} does not exist in the wallet`
      );
      console.log("Run the registerUser.js application before retrying");
      return;
    }

    var response = {
      comments: [],
    };

    let cert = identity.credentials.certificate;
    let cert_hash = sha256(cert.concat(planName));

    const voteForPlan = UserVote.find(
      {
        hash: cert_hash,
      },
      "-_id",
      { lean: true },
      function (err, val) {
        if (val.length > 0) {
          response = val[0];
        }
      }
    );

    const commentForPlan = PlanData.find(
      {
        hash: cert_hash,
      },
      "-_id",
      { lean: true },
      function (err, result) {
        if (result.length > 0) {
          response["comments"] = result[0].comments;
        }
      }
    );

    const finalResult = [await voteForPlan, await commentForPlan];

    return response;
  } catch (error) {
    return error.message;
  }
};

exports.fetchUserVote = fetchUserVote;
