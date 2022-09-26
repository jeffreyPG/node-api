"use strict";

var testUtils = require("./utils/test.utils");

String.prototype.repeat = function (count) {
	return new Array(count + 1).join(this);
};

var mocha = require("mocha"),
	Base = mocha.reporters.Base;

var _formatJson = function (json) {
	return JSON.stringify(json, null, "\t");
};

var _formatCodeBlock = function (str) {
	var _trim = function (str){
	  return str.replace(/^\s+|\s+$/g, "");
	};

	str = str.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/^\uFEFF/, "").replace(/^function *\(.*\)\s*{|\(.*\) *=> *{?/, "").replace(/\s+\}$/, "");

	var spaces = str.match(/^\n?( *)/)[1].length;
	var tabs = str.match(/^\n?(\t*)/)[1].length;
    var re = new RegExp("^\n?" + (tabs ? "\t" : " ") + "{" + (tabs ? tabs : spaces) + "}", "gm");
	str = str.replace(re, "");

	var tabCount;
	var splitArr = str.split("\n");
	splitArr.forEach(function (ele, index) {
		if (ele.match(/_\$jscoverage.*?\;/g)) {
			tabCount = (ele.match(/\t/g) || []).length;
			splitArr[index + 1] = "\t".repeat(tabCount) + splitArr[index + 1];
			splitArr.splice(index, 1);
		}
	});

	return _trim(splitArr.join("\n"));
};

var _escapeHtml = function (html) {
	return String(html).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};
var _stripSpecialChars = function (str, keepSpacesIntact) {
	var spaces = keepSpacesIntact || false;
	if (spaces) return String(str).replace(/[^A-Za-z0-9 ]/g, "");
	return String(str).replace(/[^A-Za-z0-9]/g, "");
};
// var _randomNumber = function() {
// 	return Math.floor(Math.random() * 9999) + 1;
// };

function customReport (runner) {
	var pass = 0;
	var fail = 0;

	Base.call(this, runner, false);

	var self = this,
		countId = 0,
		stats = this.stats,
		total = runner.total,
		indents = 2,
		isSuiteTitle = "suite",
		isTestFail = true,
		cleanAnchor = "",
		tableOfContentsArr = [],
		currentIndex = -1,
		testOutputData = testUtils.getParsedOutput();

	var _codeIndent = function () {
		return new Array(indents).join("  ");
	};

	var style = [
		".divider { margin-bottom: 260px; }",
		".green { color: green !important; }",
		".red { color: red !important; }",
		".final-summary-anchor { text-align: center; }",
		".results { text-align: center; }",
		".final-summary { position:absolute; top:0; border: 1px solid; }",
		".table-of-contents { position:fixed; z-index:999999; top:0; right:0; border: 1px solid; font-size:13px; background-color:white; }",
		".table-of-contents h5 { cursor:pointer; margin:0; }",
		".table-of-contents dl { overflow: auto; height: 550px; }",
		".table-of-contents dl a { color:black; }",
		".final-summary dt { color: grey; }",
		".summary-part { border: 1px dotted; }",
		"h1 { padding: 0; margin: 0; text-align: center; background-color: black; color: white; }",
		"dl { margin: 0; }",
		".suite { margin: 10px 10px 40px 10px; border: solid 1px black; background-color: rgb(218, 218, 218); }",
		".suite h1 { color: rgb(223, 223, 223); }",
		".suite-test { margin: 20px; border: 1px dotted black; background-color: white; padding-bottom: 15px; }",
		".suite-test dd { outline: 1px solid #D6D6D6; background-color: #F3F3F3; padding: 2px; margin-right: 40px; }",
		".suite-test dd.request { background-color: #E0E0E0; }",
		".suite-test dd.response { background-color: #E0E0E0; }",
		".suite-test pre { margin-top: 0; }",
		"code { display: inline-block; border: dotted 1px; padding: 5px; background-color: #333333; color: #B9B9B9; }",
		".test-status { text-align: center; font-size: 25px; font-weight: bolder; margin-top: 15px; }",
		".test-pass { color:white; background-color:green; }",
		".test-fail { color:white; background-color:red; }",
		".test-pass-title { margin: 10px; color:green; font-size: 20px; }",
		".test-fail-title { margin: 10px; color:red; font-size: 20px; }",
		".test-fail-error { color:white; background-color:red; }",
		".speed-profile { font-style: italic; }",
		".fast { color: green; }",
		".medium  { color: orange; }",
		".slow { color: red; }",
		".error { color: red; font-weight: 900; }",
		".test-block-title { margin-top: 20px; }",
		".pass-request-headers, .pass-response-headers { cursor: pointer; border: 2px double #909090; }",
		".pass-request-headers pre, .pass-response-headers pre { display: none; }",
		".fail-request-headers, .fail-response-header {}",
		".req-arrow, .res-arrow { font-size: 45px; line-height:0; position: relative; top: 10px; padding-right: 10px; }",
		".req-arrow, .res-arrow, .test-icon, .benchmark, .details { font-size: 45px; line-height:0; position: relative; top: 7px; left: 5px; float: left; }",
		".req-arrow:before { content: \"\\2687 \\21E8\"; }",
		".res-arrow:before { content: \"\\2687 \\21E6\"; }",
		".expand { font-size: 23px; float: right; position: relative; bottom: 3px; }",
		".expand:before { content: \"\\2295\"; }",
		".test-icon { top: 10px; font-size: 30px; }",
		".test-icon:before { content: \"T\" }",
		".benchmark { top: 6px; }",
		".benchmark:before { content: \"\\2B04\" }",
		".details { top: 5px; padding-left: 46%; }",
		".details:before { content: \"\\2261 \" }",
		".test-header { margin: 8px 39px 0px 39px; padding: 7px 0px; font-size: 15px; color: #505050; background-color: #a7a7a7; text-align: center; }"
	].join(" ");

	var js = "function init() {" +
		"var tableOfContents = document.getElementById(\"table-of-contents-dl\");" +
		"var showHide = document.getElementById(\"show-hide\");" +
		"var tableOfContentsAnchors = document.getElementsByClassName(\"toc-anchor\");" +
		"showHide.onclick = function() { tableOfContents.style.display = \"block\"; };" +

		"for(var i = 0; i < tableOfContentsAnchors.length; i += 1) {" +
			"tableOfContentsAnchors[i].onclick = function() {" +
				"tableOfContents.style.display = \"none\";" +
			"}" +
		"}" +

		"var elePreTagStyleAttribute;" +
		"function bindClickEventShow(ele) {" +
			"ele.onclick = function() {" +
				"elePreTagStyleAttribute = ele.getElementsByTagName(\"pre\")[0].style;" +
				"elePreTagStyleAttribute.display = (elePreTagStyleAttribute.display === \"block\") ? \"none\" : \"block\";" +
			"}" +
		"}" +

		"var passedRequestHeaderDivsArr = document.getElementsByClassName(\"pass-request-headers\") || [];" +
		"var passedResponseHeaderDivsArr = document.getElementsByClassName(\"pass-response-headers\") || [];" +
		"Array.prototype.map.call(passedRequestHeaderDivsArr, bindClickEventShow);" +
		"Array.prototype.map.call(passedResponseHeaderDivsArr, bindClickEventShow);" +

	"};";

	runner.on("start", function (){
		console.log("<!DOCTYPE html><html lang=\"en\" xmlns=\"http://www.w3.org/1999/xhtml\"><style>" + style + "</style>");
		console.log("<script>" + js + "</script>");
		console.log("<body onload=\"init();\">");
		console.log("<br />");
		console.log("<div class=\"divider\"></div>");
		console.log("{% if file %}<p>Test Summary report last generated on: {{file.mtime.toString()}}.</p>{% endif %}");
		console.log("<br />");
	});

	runner.on("suite", function (suite){
		if (suite.root) return;

		countId += 1;

		isSuiteTitle = (suite.tests && suite.tests.length === 0) ? "suite" : "suite-test";
		cleanAnchor =  _stripSpecialChars(suite.title) + countId;

		indents += 1;
		console.log("%s <a name=\"%s\"></a>", _codeIndent(), cleanAnchor);
		console.log("%s <div class=\"" + isSuiteTitle + "\">", _codeIndent());
		indents += 1;
		console.log("%s <h1>%s</h1>", _codeIndent(), _escapeHtml(suite.title));
		console.log("%s <dl>", _codeIndent());

		tableOfContentsArr.push({
			anchorKey: cleanAnchor,
			title: _stripSpecialChars(suite.title, true),
			isParent: (isSuiteTitle === "suite")
		});
	});

	runner.on("suite end", function (suite){
		if (suite.root) return;

		console.log("%s </dl>", _codeIndent());
		indents -= 1;
		console.log("%s </div>", _codeIndent());
		indents -= 1;
	});

	runner.on("pass", function (test){
		pass += 1;

		var hasCommData = (testOutputData[0] && testOutputData[0].path && test.file && test.file.indexOf(testOutputData[0].path) !== -1);
		if (hasCommData) currentIndex += 1;

		console.log("%s <div class=\"test-status test-pass\">&#10003 PASS</div><dt><div class=\"test-pass-title\"><p>%s</p></div></dt>", _codeIndent(), _escapeHtml(test.title));
		console.log("<h5 class=\"test-header\"><span class=\"benchmark\"></span>Profile Details</h5>", _codeIndent());
		console.log("%s <dd>Speed: <span class=\"speed-profile\"><span class=\"%s\">%s ms</span></span></dd>", _codeIndent(), test.speed, test.duration);
		if (hasCommData && testOutputData[currentIndex]){
			console.log("<h5 class=\"test-header\"><span class=\"req-arrow\"></span>Client Request Details</h5>", _codeIndent());
			if (testOutputData[currentIndex].request.meta.method) console.log("%s <dd class=\"request\">Method: %s</dd>", _codeIndent(), testOutputData[currentIndex].request.meta.method);
			if (testOutputData[currentIndex].request.meta.path) console.log("%s <dd class=\"request\">Path: %s</dd>", _codeIndent(), testOutputData[currentIndex].request.meta.path);
			console.log("%s <dd class=\"request pass-request-headers\">Headers: <span class=\"details\"></span><span class=\"expand\"></span><pre><code>%s</code></pre></dd>", _codeIndent(), _formatJson(testOutputData[currentIndex].request.headers));
			console.log("%s <dd class=\"request\">Body: <pre><code>%s</code></pre></dd>", _codeIndent(), _formatJson(testOutputData[currentIndex].request.body));
		}
		console.log("<h5 class=\"test-header\"><span class=\"test-icon\"></span>Test Details</h5>", _codeIndent());
		var code = _escapeHtml(_formatCodeBlock(test.fn.toString()));
		console.log("%s <dd><div class=\"test-block-title\">Test Block:</div><pre><code>%s</code></pre></dd>", _codeIndent(), code);
		if (hasCommData && testOutputData[currentIndex]){
			console.log("<h5 class=\"test-header\"><span class=\"res-arrow\"></span>Server Response Details</h5>", _codeIndent());
			if (testOutputData[currentIndex].response.meta.statusCode && testOutputData[currentIndex].response.meta.statusMessage) {
				console.log("%s <dd class=\"response\">Code: %s %s</dd>", _codeIndent(), testOutputData[currentIndex].response.meta.statusCode, testOutputData[currentIndex].response.meta.statusMessage);
			}
			console.log("%s <dd class=\"response pass-response-headers\">Headers: <span class=\"details\"></span><span class=\"expand\"></span><pre><code>%s</code></pre></dd>", _codeIndent(), _formatJson(testOutputData[currentIndex].response.headers));
			console.log("%s <dd class=\"response\">Body: <pre><code>%s</code></pre></dd>", _codeIndent(), _formatJson(testOutputData[currentIndex].response.body));
		}
	});

	runner.on("fail", function (test, err){
		fail += 1;

		var hasCommData = (testOutputData[0] && testOutputData[0].path && test.file && test.file.indexOf(testOutputData[0].path) !== -1);
		if (hasCommData) currentIndex += 1;

		console.log("%s <div class=\"test-status test-fail\">&#10007; FAIL</div><dt><div class=\"test-fail-error\"><p>%s</p></div></dt>", _codeIndent(), _escapeHtml(test.title));
		console.log("<h5 class=\"test-header\"><span class=\"benchmark\"></span>Profile Details</h5>", _codeIndent());
		console.log("%s <dd>Speed Profile: <span class=\"speed-profile\"><span class=\"%s\">%s ms</span></span></dd>", _codeIndent(), test.speed, test.duration);
		if (hasCommData && testOutputData[currentIndex]){
			console.log("<h5 class=\"test-header\"><span class=\"req-arrow\"></span>Client Request Details</h5>", _codeIndent());
			if (testOutputData[currentIndex].request.meta.method) console.log("%s <dd class=\"request\">Request Method: %s</dd>", _codeIndent(), testOutputData[currentIndex].request.meta.method);
			if (testOutputData[currentIndex].request.meta.path) console.log("%s <dd class=\"request\">Request Path: %s</dd>", _codeIndent(), testOutputData[currentIndex].request.meta.path);
			console.log("%s <dd class=\"request fail-request-headers\">Request Headers: <span class=\"details\"></span><span class=\"expand\"></span><pre><code>%s</code></pre></dd>", _codeIndent(), _formatJson(testOutputData[currentIndex].request.headers));
			console.log("%s <dd class=\"request\">Request Body: <pre><code>%s</code></pre></dd>", _codeIndent(), _formatJson(testOutputData[currentIndex].request.body));
		}
		console.log("<h5 class=\"test-header\"><span class=\"test-icon\"></span>Test Details</h5>", _codeIndent());
		var code = _escapeHtml(_formatCodeBlock(test.fn.toString()));
		console.log("%s <dd><div class=\"test-block-title\">Test Block:</div><pre><code>%s</code></pre></dd>", _codeIndent(), code);
		console.log("%s <dd class=\"error\">%s</dd>", _codeIndent(), _escapeHtml(err));
		if (hasCommData && testOutputData[currentIndex]){
			console.log("<h5 class=\"test-header\"><span class=\"res-arrow\"></span>Server Response Details</h5>", _codeIndent());
			if (testOutputData[currentIndex].response.meta.statusCode && testOutputData[currentIndex].response.meta.statusMessage) {
				console.log("%s <dd class=\"response\">Code: %s %s</dd>", _codeIndent(), testOutputData[currentIndex].response.meta.statusCode, testOutputData[currentIndex].response.meta.statusMessage);
			}
			console.log("%s <dd class=\"response fail-response-headers\">Response Headers: <span class=\"details\"></span><span class=\"expand\"></span><pre><code>%s</code></pre></dd>", _codeIndent(), _formatJson(testOutputData[currentIndex].response.headers));
			console.log("%s <dd class=\"response\">Response Body: <pre><code>%s</code></pre></dd>", _codeIndent(), _formatJson(testOutputData[currentIndex].response.body));
		}
	});

	runner.on("end", function (){
		isTestFail = (pass === total) ? "green" : "red";

		console.log("<p class=\"results " + isTestFail + "\">Results: %d/%d</p>", pass, total);
		console.log(
			"<div class=\"final-summary\"><a name=\"summary\"></a><dl>" +
				"<div class=\"summary-part\"><dt>Suites</dt><dd>" + stats.suites + "</dd></div>" +
				"<div class=\"summary-part\"><dt>Tests</dt><dd>" + stats.tests + "</div></dd>" +
				"<div class=\"summary-part green\"><dt class=\"green\">Passes</dt><dd>" + stats.passes + "</div></dd>" +
				"<div class=\"summary-part red\"><dt class=\"red\">Failures</dt><dd>" + stats.failures + "</div></dd>" +
				"<div class=\"summary-part\"><dt>Start Time</dt><dd>" + stats.start + "</div></dd>" +
				"<div class=\"summary-part\"><dt>End Time</dt><dd>" + stats.end + "</div></dd>" +
				"<div class=\"summary-part\"><dt>Total Duration</dt><dd>" + stats.duration * 0.001 + " secs</div></dd>" +
			"</dl></div>"
		);
		console.log("<div class=\"table-of-contents\"><h5 id=\"show-hide\"> &#8597; Go to Test</h5><dl id=\"table-of-contents-dl\">");
		tableOfContentsArr.forEach(function (ele) {
			if (ele.isParent) {
				console.log("<dt><a href=\"#%s\" class=\"toc-anchor\">%s</a></dt>", ele.anchorKey, ele.title);
			} else {
				console.log("<dd> &#8627; <a href=\"#%s\" class=\"toc-anchor\">%s</a></dd>", ele.anchorKey, ele.title);
			}
		});
		console.log("</dl></div>");
		console.log("</body></html>");
		// process.exit(fail);
	});
}

module.exports = customReport;
