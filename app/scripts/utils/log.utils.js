const horizontalLine = (length = null, type = "-") => {
    length = length || 100;
    const arry = [];
    while (length > 0) {
        arry.push(type);
        length--;
    };
    return arry.join("");
};

module.exports = {
    horizontalLine
}