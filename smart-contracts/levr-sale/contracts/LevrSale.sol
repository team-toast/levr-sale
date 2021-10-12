pragma solidity ^0.5.0;

import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "./DSMath.sol";

contract SaleGulper is DSMath
{
    using SafeMath for uint256;

    // TODO : make a contract that gulps Ether into 50% RAI and 50% ether and buys burns 
    // BPT tokens on the gravity well pool (by sending them to 0x01)
}

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

contract RewardLocker is DSMath
{
    using SafeMath for uint256;

    struct Deposit
    {
        uint amount;
        uint lockUpPeriod;
        uint share;
    }

    mapping (address => uint) shares;

    function stake(uint _amount, uint _time, address _retriever) public;
    function claim(address _recipient) public;
}

contract Sale is DSMath
{
    using SafeMath for uint256;

    uint constant ONE_PERC = 10 ** 16;
    uint constant ONE_HUNDRED_PERC = 10 ** 18;

    uint raised;
    uint tokensIssued;
    uint incline;

    ERC20Mintable tokenOnSale;

    address gulper;
    address treasury;
    address liquidity;
    address foundryTreasury;

    struct TokenRegister
    {
        uint releaseTime;
        uint amount;
    }

    mapping(address => TokenRegister) public register;

    constructor(
            uint _incline,
            ERC20Mintable _tokenOnSale, 
            address _gulper, 
            address _treasury, 
            address _liquidity, 
            address _foundryTreasury)
        public
    {
        incline = _incline;
        tokenOnSale = _tokenOnSale;
        gulper = _gulper;
        treasury = _treasury;
        liquidity = _liquidity;
        foundryTreasury = _foundryTreasury;
    }

    event Bought
    (
        address _retriever,
        uint _amount
    );

    event Claimed
    (
        address _receiver,
        uint _amount
    );

    function()
        external
    {
        buy(msg.sender);
    }

    function buy(address _retriever)
        public
        payable
    {
        uint tokensAssigned = calculateTokensReceived(msg.value);

        assignTokens(_retriever, tokensAssigned);
        (bool success,) = gulper.call.value(msg.value)("");
        require(success, "gulper malfunction");

        emit Bought(_retriever, tokensAssigned);
    }

    function assignTokens(address _retriever, uint _amount)
        private
    {
        register[_retriever].releaseTime = block.timestamp.add(5 days);
        register[_retriever].amount = register[_retriever].amount.add(_amount);
    }

    function claimTokens(address _receiver)
        public 
    {
        require(register[msg.sender].releaseTime <= block.timestamp, "cooldown pending");
        uint amount = register[msg.sender].amount;

        tokenOnSale.mint(_receiver, amount);                // 4/7
        tokenOnSale.mint(treasury, amount.div(7));          // 1/7
        tokenOnSale.mint(liquidity, amount.div(7));         // 1/7
        tokenOnSale.mint(foundryTreasury, amount.div(7));   // 1/7

        register[msg.sender].releaseTime = 0;
        register[msg.sender].amount = 0;

        emit Claimed(_receiver, amount);
    }

    function sqrt(uint _value)
        public
        pure
        returns(uint)
    {
        rpow(_valueWAD, RAY.div(2));
    }

    function pureCalculateSupply(uint _incline, uint _raised)
        public
        pure
        returns(uint _tokens)
    {
        uint inclineRAY = _incline.mul(10**9);
        uint raisedRAY = _raised.mul(10**9);
        _tokens = sqrt(uint(2).mul(inclineRAY).mul(raisedRAY)).div(10**9)));
    }

    function pureCalculateTokensRecieved(uint _incline, uint _alreadyRaised, uint _supplied)
        public
        pure
        returns (uint _tokensReturned)
    {
        _tokensReturned = pureCalculateSupply(_incline, _alreadyRaised.add(_supplied)).sub(pureCalculateSupply(_incline, _alreadyRaised));
    }

    function calculateTokensReceived(uint _supplied)
        public
        view
        returns (uint _tokensReturned)
    {
        _tokensReturned = pureCalculateTokensRecieved(incline, raised, _supplied);
    }

    function pureCalculatePricePerToken(uint _incline, uint _alreadyRaised, uint _supplied)
        public
        pure
        returns(uint _price)
    {
        _price = pureCalculateTokensRecieved(_incline, _alreadyRaised, _supplied).mul(10**18).div(_supplied);
    }

    function calculatePricePerToken(uint _supplied)
        public
        view
        returns(uint _price)
    {
        _price = pureCalculatePricePerToken(incline, raised, _supplied);
    }
}