


const findIndexes = (firstInteger, firstIntegerIndex, targetSum , numsListRemain) => {
    const secondIntegerExpected = targetSum - firstInteger;
    const indexOfSecondInteger = numsListRemain.indexOf(secondIntegerExpected);
    if (indexOfSecondInteger >= 0) {
        return Array.from([firstIntegerIndex, indexOfSecondInteger + firstIntegerIndex +1]);
    }
    else {
        const firstIntegerThen = numsListRemain[0];
        numsListRemain.shift()
        return findIndexes(firstIntegerThen,  firstIntegerIndex+1, targetSum, numsListRemain)
    }
}

var twoSum = function(nums, target) {
    const firstInteger = nums[0];
    nums.shift();
    return findIndexes(firstInteger, 0, target, nums);

};

const nums =[2,7,11,15];
const target = 26;
const result = twoSum(nums, target);
console.log(result);