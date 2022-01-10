pragma solidity ^0.8.0;

interface ISale 
{
    function calculateTokensReceived(uint)
        external
        view
        returns (uint);

    function calculatePricePerToken(uint)
        external
        view
        returns(uint);

    function tokensIssued()
        external
        view
        returns(uint);
    
    function raised()
        external
        view
        returns(uint);
}

contract SaleInfo 
{

    ISale public Sale;

    constructor(ISale _SaleAddress) 
    {
        Sale = _SaleAddress;
    }

    function getSaleInfo(uint _supplied)
    public
    view
    returns(uint price, uint tokensReceived, uint raised, uint tokensIssued)
    {
        price = Sale.calculatePricePerToken(_supplied);
        tokensReceived = Sale.calculateTokensReceived(_supplied);
        raised = Sale.raised();
        tokensIssued = Sale.tokensIssued();
    }

}