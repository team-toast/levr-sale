pragma solidity ^0.8.0;

interface IERC20Mintable 
{
    function mint(address, uint) external returns (bool);
}

contract Sale
{
    uint constant ONE_PERC = 10**16;
    uint constant ONE_HUNDRED_PERC = 10**18;
    uint constant STARTING_POINT = 1000 * 10**18;
    uint constant WAD = 10**18;

    uint public raised = STARTING_POINT; //used this to spare one storage slot and simplify later code                      
    uint public tokensSold;                       
    uint public inclineWAD;                         

    IERC20Mintable public tokenOnSale;

    // gulpers
    address public gulper;

    address public treasury;
    address public foundryTreasury;

    constructor(
            uint _inclineWAD,
            IERC20Mintable _tokenOnSale, 
            address _gulper, 
            address _treasury, 
            address _foundryTreasury)
    {
        inclineWAD = _inclineWAD;
        tokenOnSale = _tokenOnSale;
        gulper = _gulper;
        treasury = _treasury;
        foundryTreasury = _foundryTreasury;
    }

    event Bought
    (
        address _receiver,
        uint _amount
    );

    receive()
        payable
        external
    {
        buy(msg.sender);
    }

    function buy(address _receiver)
        public
        payable
    {
        uint tokensAssigned = calculateTokensReceived(msg.value);
        
        (bool success,) = gulper.call{value:msg.value}("");
        require(success, "gulper malfunction");

        tokensSold = tokensSold + tokensAssigned;
        raised = raised + msg.value;

        mintTokens(_receiver, tokensAssigned);
        emit Bought(_receiver, tokensAssigned);
    }

    function mintTokens(address _receiver, uint _amount)
        private 
    {
        tokenOnSale.mint(_receiver, _amount);           // 3

        // Only 66% of the amount issued to the buyer, this is to make the price slightly higher and compensate for the dEh arbitrage that's going to occur.
        tokenOnSale.mint(gulper, 2*_amount/3);          // 2

        // give the the levr treasury it's share
        tokenOnSale.mint(treasury, _amount/3);         // 2

        // reward the foundry treasury for it's role
        tokenOnSale.mint(foundryTreasury, _amount/3);  // 1
    }

    function pureCalculateSupply(uint _inclineWAD, uint _raised)
        public
        pure
        returns(uint _tokens)
    {
        // (2*incline*raised)^0.5 
        _tokens = sqrt(uint(2) * _inclineWAD * _raised / WAD);
    }

    function pureCalculateTokensRecieved(uint _inclineWAD, uint _alreadyRaised, uint _supplied) 
        public
        pure
        returns (uint _tokensReturned)
    {
        _tokensReturned = pureCalculateSupply(_inclineWAD, _alreadyRaised + _supplied) - pureCalculateSupply(_inclineWAD, _alreadyRaised);
    }

    function calculateTokensReceived(uint _supplied)
        public
        view
        returns (uint _tokensReturned)
    {
        _tokensReturned = pureCalculateTokensRecieved(inclineWAD, raised, _supplied);       
    }

    function pureCalculatePrice(uint _inclineWAD, uint _tokensSold)
        public
        pure
        returns(uint _price)
    {
        _price = _tokensSold * WAD / _inclineWAD;
    }

    function calculatePrice(uint _tokensSold)
        public
        view
        returns(uint _price)
    {
        _price = pureCalculatePrice(inclineWAD, _tokensSold);
    }

    function getCurrentPrice()
        public
        view
        returns(uint _price)
    {
        _price = calculatePrice(tokensSold);
    }

    function pureCalculatePricePerToken(uint _inclineWAD, uint _alreadyRaised, uint _supplied)              
        public
        pure
        returns(uint _price)
    {
        _price = _supplied * WAD / pureCalculateTokensRecieved(_inclineWAD, _alreadyRaised, _supplied);
    }

    function calculatePricePerToken(uint _supplied)
        public
        view
        returns(uint _price)
    {
        _price = pureCalculatePricePerToken(inclineWAD, raised, _supplied);
    }

    function pointPriceWAD()
        public
        view
        returns(uint _price)
    {
        _price = raised * WAD / tokensSold;
    }

    // babylonian method
    function sqrt(uint x) 
        public 
        pure
        returns (uint y) 
    {
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x/z + z) / 2;
            (x/z + z)/2;
        }
    }
}