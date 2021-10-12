pragma solidity ^0.5.17;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "./DSMath.sol";

contract Faucet is DSMath
{
    using SafeMath for uint256;

    uint constant ONE_PERC = 10 ** 16;
    uint constant ONE_HUNDRED_PERC = 10 ** 18;

    ERC20Mintable token;
    address treasury;
    uint releaseRateRAY;    // the per second interest rate on the total supply.
    uint lastPokedTime;

    constructor(
            ERC20Mintable _token,
            address _treasury,
            uint _releaseRateRAY)
        public
    {
        treasury = _treasury;
        token = _token;
        releaseRateRAY = _releaseRateRAY;
        lastPokedTime = block.timestamp;
    }

    function poke()
        public
    {
        token.mint(treasury, dripAmount());
        lastPokedTime = block.timestamp;
    }

    function dripAmount()
        public
        view
        returns (uint _dripAmount)
    {
        uint elapsedTime = block.timestamp.sub(lastPokedTime);
        uint totalSupply = token.totalSupply();
        _dripAmount = rpow(releaseRateRAY, elapsedTime)
            .mul(totalSupply)
            .sub(totalSupply);
    }
}