pragma solidity ^0.5.17;

import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "./DSMath.sol";

contract SaleGulper is DSMath
{
    using SafeMath for uint256;

    // TODO : make a contract that gulps Ether into 50% ETH and 50% dETH and buys burns 
    // BPT tokens on the gravity well pool (by sending them to 0x01)

    function poke()
        public
    {

    }
}

pragma solidity ^0.5.17;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IERC20Wrapper is IERC20
{
    function deposit() payable public;
    function withdraw(uint _amount) public;
}

contract IdEth is IERC20
{
    function squanderMyEthForWorthlessBeansAndAgreeToTerms(address _receiver)
        payable
        public;   
}

contract BalancerPool is IERC20 
{   
    function calcPoolOutGivenSingleIn(
            uint tokenBalanceIn,
            uint tokenWeightIn,
            uint poolSupply,
            uint totalWeight,
            uint tokenAmountIn,
            uint swapFee)
        public pure
        returns (uint poolAmountOut);

    function joinswapExternAmountIn(
            address tokenIn,
            uint256 tokenAmountIn,
            uint256 minPoolAmountOut)
        public;
}

contract EthGulper
{
    // goal: a contract to receive funds in the form of eth and erc20s and spend them in predetermined ways

    using SafeMath for uint256;

    constructor () public { }

    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address public constant POOL = 0x5277a42ef95ECa7637fFa9E69B65A12A089FE12b;

    event gulped(uint _ether, uint _poolTokens, uint _pokeReward);

    function getGulpDetails()
        public
        view
        returns (uint _wethBalanceToConvert, uint _minTokensToClaim, uint _pokeReward)
    {
        uint ethBalance = address(this).balance;
        uint wethBalance = ethBalance.add(IERC20Wrapper(WETH).balanceOf(address(this)));
        // following line pays out 0.1% of the weth to the person poking this contract
        _pokeReward = wethBalance.div(1000);
        _wethBalanceToConvert = wethBalance.sub(_pokeReward);
        uint wethPoolBalance = IERC20Wrapper(WETH).balanceOf(POOL);
        uint poolBalance = BalancerPool(POOL).totalSupply();
        uint tokensOut = BalancerPool(POOL)
            .calcPoolOutGivenSingleIn(
                wethPoolBalance,
                5 * 10**18,
                poolBalance,
                10 * 10**18,
                _wethBalanceToConvert,
                10**17);
        _minTokensToClaim = tokensOut.mul(95 * 10**9).div(100 * 10**9);
    }

    function gulp() 
        public
    {
        // goals: 
        // 1. take the ether balance of address(this) and send it to the permafrost

        // logic:
        // *get the eth balance of this
        // *make wrapped ether
        // *calculate the min amount of pool tokens that we should receive for that much eth
        // *call joinswapExternAmountIn() for that amount of weth
        // *send the pool tokens to 0x01
        // *send a reward to msg.sender for poking the contract. 

        (uint wethBalanceToConvert, uint minTokensToClaim, uint pokeReward) = getGulpDetails();
        IERC20Wrapper(WETH).deposit.value(address(this).balance)();
        BalancerPool(POOL).joinswapExternAmountIn(WETH, wethBalanceToConvert, minTokensToClaim);
        uint poolTokensToBurn = BalancerPool(POOL).balanceOf(address(this)); 
        BalancerPool(POOL).transfer(address(1), poolTokensToBurn);

        IERC20Wrapper(WETH).withdraw(pokeReward);
        emit gulped(wethBalanceToConvert, poolTokensToBurn, pokeReward);
        msg.sender.call.value(pokeReward)("");
    }

    event ethReceived(address _from, uint _amount); 
    
    function approveWethToPool()
        public
    {
        IERC20Wrapper(WETH).approve(POOL, uint(-1));
    }

    function () 
        external 
        payable 
    { 
        emit ethReceived(msg.sender, msg.value);
    }
}