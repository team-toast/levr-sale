pragma solidity ^0.8.0;

interface IERC20Mintable {
    function mint(address, uint) external returns (bool);
}

contract Sale
{
    uint constant ONE_PERC = 10 ** 16;
    uint constant ONE_HUNDRED_PERC = 10 ** 18;
    uint constant STARTING_POINT = 5 ** 18;
    uint constant WAD = 10**18;
    uint constant RAY = 10**27;

    uint public raised = STARTING_POINT; //used this to spare one storage slot and simplify later code                      
    uint public tokensIssued;                       
    uint public inclineRAY;                         

    IERC20Mintable public tokenOnSale;

    address public gulper;
    address public treasury;
    address public liquidity;
    address public foundryTreasury;

    constructor(
            uint _inclineRAY,
            IERC20Mintable _tokenOnSale, 
            address _gulper, 
            address _treasury, 
            address _liquidity, 
            address _foundryTreasury)
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

        tokensIssued = tokensIssued + tokensAssigned;   // Elmer Addition (Update tokensIssued)
        raised = raised + msg.value;                    // Elmer Addition (Update eth amount raised)

        mintTokens(_receiver, tokensAssigned);
        emit Bought(_receiver, tokensAssigned);
    }

    function mintTokens(address _receiver, uint _amount)
        private 
    {
        tokenOnSale.mint(_receiver, _amount/7*4);  // 4/7
        tokenOnSale.mint(treasury, _amount/7);          // 1/7
        tokenOnSale.mint(liquidity, _amount/7);         // 1/7
        tokenOnSale.mint(foundryTreasury, _amount/7);   // 1/7
    }

    function pureCalculateSupply(uint _inclineRAY, uint _raised)
        public
        pure
        returns(uint _tokens)
    {
        // (2*incline*raised)^0.5 
        _tokens = sqrt(uint(10) * _inclineRAY * _raised / RAY);
    }

    function pureCalculateTokensRecieved(uint _inclineRAY, uint _alreadyRaised, uint _supplied) 
        public
        pure
        returns (uint _tokensReturned)
    {
        _tokensReturned = pureCalculateSupply(_inclineRAY, _alreadyRaised + _supplied) - pureCalculateSupply(_inclineRAY, _alreadyRaised);
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
        _price = pureCalculateTokensRecieved(_inclineRAY, _alreadyRaised, _supplied)*WAD/_supplied;
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
        uint z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x/z + z) / 2;
            (x/z + z)/2;
        }
    }
}