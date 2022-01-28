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
    uint constant STARTING_POINT = 10 ** 18;

    uint public raised = STARTING_POINT; //used this to spare one storage slot and simplify later code                      
    uint public tokensIssued;                       
    uint public inclineRAY;                         

    ERC20Mintable public tokenOnSale;

    address public gulper;
    address public treasury;
    address public liquidity;
    address public foundryTreasury;

    constructor(
            uint _inclineRAY,
            ERC20Mintable _tokenOnSale, 
            address _gulper, 
            address _treasury, 
            address _liquidity, 
            address _foundryTreasury)
        public
    {
        inclineRAY = _inclineRAY;
        tokenOnSale = _tokenOnSale;
        gulper = _gulper;
        treasury = _treasury;
        liquidity = _liquidity;
        foundryTreasury = _foundryTreasury;
    }

    event Bought
    (
        address _receiver,
        uint _amount
    );

    function()
        external
    {
        buy(msg.sender);
    }

    function buy(address _receiver)
        public
        payable
    {
        uint tokensAssigned = calculateTokensReceived(msg.value);

        
        (bool success,) = gulper.call.value(msg.value)("");
        require(success, "gulper malfunction");

        tokensIssued = tokensIssued.add(tokensAssigned);   // Elmer Addition (Update tokensIssued)
        raised = raised.add(msg.value);                    // Elmer Addition (Update eth amount raised)

        mintTokens(_receiver, tokensAssigned);
        emit Bought(_receiver, tokensAssigned);
    }

    function mintTokens(address _receiver, uint _amount)
        private 
    {
        tokenOnSale.mint(_receiver, _amount.div(7).mul(4));  // 4/7
        tokenOnSale.mint(treasury, _amount.div(7));          // 1/7
        tokenOnSale.mint(liquidity, _amount.div(7));         // 1/7
        tokenOnSale.mint(foundryTreasury, _amount.div(7));   // 1/7
    }

    function pureCalculateSupply(uint _inclineRAY, uint _raised)
        public
        pure
        returns(uint _tokens)
    {
        // (2*incline*raised)^0.5 
        _tokens = sqrt(uint(10).mul(_inclineRAY).mul(_raised).div(RAY));
    }

    function pureCalculateTokensRecieved(uint _inclineRAY, uint _alreadyRaised, uint _supplied) 
        public
        pure
        returns (uint _tokensReturned)
    {
        _tokensReturned = pureCalculateSupply(_inclineRAY, _alreadyRaised.add(_supplied)).sub(pureCalculateSupply(_inclineRAY, _alreadyRaised));
    }

    function calculateTokensReceived(uint _supplied)
        public
        view
        returns (uint _tokensReturned)
    {
        _tokensReturned = pureCalculateTokensRecieved(inclineRAY, raised, _supplied);       
    }

    function pureCalculatePricePerToken(uint _inclineRAY, uint _alreadyRaised, uint _supplied)              
        public
        pure                                                                        
        returns(uint _price)
    {
        _price = pureCalculateTokensRecieved(_inclineRAY, _alreadyRaised, _supplied).mul(WAD).div(_supplied);
    }

    function calculatePricePerToken(uint _supplied)
        public
        view
        returns(uint _price)
    {
        _price = pureCalculatePricePerToken(inclineRAY, raised, _supplied);
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