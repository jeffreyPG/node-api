/**
 * Returns the string with captilized the first letter
 * @param {String} string 
 */
const capitalize = (string) => {
    return string && string.charAt(0).toUpperCase() + string.slice(1) || "";
};

module.exports = {
    capitalize
}