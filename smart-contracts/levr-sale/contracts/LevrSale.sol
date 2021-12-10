pragma solidity ^0.5.17;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "./DSMath.sol";

contract Sale is DSMath
{
    using SafeMath for uint256;

    uint constant ONE_PERC = 10 ** 16;
    uint constant ONE_HUNDRED_PERC = 10 ** 18;

    uint public raised;                             // Elmer Addition (Added public for debugging)
    uint public tokensIssued;                       // Elmer Addition (Added public for debugging)
    uint public inclineRAY;                         // Elmer Addition (Added public for debugging)
    uint public startingPoint;                      // Elmer Addition (Variable to offset the starting price to skip initial steep part of curve)

    ERC20Mintable public tokenOnSale;

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
            uint _inclineRAY,
            uint _startingPoint,
            ERC20Mintable _tokenOnSale, 
            address _gulper, 
            address _treasury, 
            address _liquidity, 
            address _foundryTreasury)
        public
    {
        inclineRAY = _inclineRAY;
        startingPoint = _startingPoint;
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

        tokensIssued = tokensIssued.add(tokensAssigned);   // Elmer Addition (Update tokensIssued)
        raised = raised.add(msg.value);                    // Elmer Addition (Update eth amount raised)

        emit Bought(_retriever, tokensAssigned);
    }

    function assignTokens(address _retriever, uint _amount)
        private
    {
        register[_retriever].releaseTime = block.timestamp.add(1 minutes);      // Elmer Addition (1 minute instead of 5 days for testing)
        register[_retriever].amount = register[_retriever].amount.add(_amount);
    }

    function claimTokens(address _receiver)
        public 
    {
        require(register[msg.sender].releaseTime <= block.timestamp, "cooldown pending");
        uint amount = register[msg.sender].amount;

        tokenOnSale.mint(_receiver, amount.div(7).mul(4));  // 4/7
        tokenOnSale.mint(treasury, amount.div(7));          // 1/7
        tokenOnSale.mint(liquidity, amount.div(7));         // 1/7
        tokenOnSale.mint(foundryTreasury, amount.div(7));   // 1/7

        register[msg.sender].releaseTime = 0;
        register[msg.sender].amount = 0;

        emit Claimed(_receiver, amount);
    }

    function pureCalculateSupply(uint _inclineRAY, uint _raised, uint _startingPoint)
        public
        pure
        returns(uint _tokens)
    {
        // (2*incline*raised+startingPoint)^0.5 
        _tokens = sqrt(uint(10).mul(_inclineRAY).mul(_raised.add(_startingPoint)).div(RAY)); // Elmer Addition (Added startingPoint offset to calculation)
    }

    function pureCalculateTokensRecieved(uint _inclineRAY, uint _alreadyRaised, uint _supplied, uint _startingPoint) 
        public
        pure
        returns (uint _tokensReturned)
    {
        _tokensReturned = pureCalculateSupply(_inclineRAY, _alreadyRaised.add(_supplied), _startingPoint).sub(pureCalculateSupply(_inclineRAY, _alreadyRaised, _startingPoint)); // Elmer Addition (Added startingPoint to calculation)
    }

    function calculateTokensReceived(uint _supplied)
        public
        view
        returns (uint _tokensReturned)
    {
        _tokensReturned = pureCalculateTokensRecieved(inclineRAY, raised, _supplied, startingPoint);        // Elmer Addition (Added startingPoint to calculation)
    }

    function viewCalculatePricePerToken(uint _inclineRAY, uint _alreadyRaised, uint _supplied)              
        public
        view                                                                        // Elmer Addition (Changed from pure to view)
        returns(uint _price)
    {
        _price = pureCalculateTokensRecieved(_inclineRAY, _alreadyRaised, _supplied, startingPoint).mul(WAD).div(_supplied);
    }

    function calculatePricePerToken(uint _supplied)
        public
        view
        returns(uint _price)
    {
        _price = viewCalculatePricePerToken(inclineRAY, raised, _supplied);
    }

    // babylonian method
    function sqrt(uint x) 
        public 
        pure
        returns (uint y) 
    {
        uint z = (x.add(1)).div(2);
        y = x;
        while (z < y) {
            y = z;
            z = (x.div(z).add(z)).div(2);
        }
    }
}