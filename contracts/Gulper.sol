pragma solidity ^0.5.0;

contract Splitter
{
    function Split()
        public
    {
        // logic:
        // * wrap all Eth to Weth
        // * get weth balance
        //      * send 47.5% of weth to EthGulper
        //      * convert 47.5% of weth to DAI
        //      * send DAI to DAIGulper
        //      * buy back and burn FRY for 5% of weth.
        //
        // * get LEVR balance
        //     * send 1/3rd of LEVR to EthGulper
        //     * send 1/3rd of LEVR to LEVRGulper
        //     * send 1/3rd of LEVR to dEthGulper
    }
}

contract Gulper
{
    address public Pool;
    address public LEVRErc20;
    address public CollateralErc20;

    function gulp()
        public
    {
        // logic:
        // * takes the balance of CollateralErc20
        // * joins the pool
        // * takes the balance of LEVRTokens
        // * joins the pool
        // * burns all pool tokens
    }
}